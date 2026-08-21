/**
 * Chat recorder: holds a Pusher socket open for the length of a live stream and
 * banks per-second message counts.
 *
 * This is the signal the off-the-shelf clippers don't have. OpusClip and Vizard
 * score on speech density — they were built for podcasts, so on a stream they
 * find the streamer *talking*, not the moment chat lost its mind. Kick chat
 * exploding is the crowd telling us where the clip is, for free.
 *
 * Recordings run concurrently (one socket per live channel) while the poll loop
 * keeps ticking, so a 9-hour broadcast doesn't block every other tenant.
 */

import { sql } from "../db.ts";
import { resolveChatroomId } from "../kickweb.ts";
import { BucketAccumulator } from "./buckets.ts";
import {
  chatChannel,
  parseFrame,
  pingFrame,
  pongFrame,
  pusherUrl,
  subscribeFrame,
} from "./pusher.ts";

interface Capture {
  id: string;
  tenantId: string;
  slug: string;
  chatroomId: string | null;
  streamStartedAt: Date;
}

/** How often banked counts hit the database. A crash loses at most this much. */
const FLUSH_MS = 30_000;
/** Give up on a socket that has gone quiet for this long and reconnect. */
const IDLE_TIMEOUT_MS = 150_000;
/** Nothing streams this long; stop recording rather than leak a socket. */
const MAX_SESSION_MS = 14 * 3600_000;
/** Sockets per worker. Each is one live channel. */
const MAX_CONCURRENT = 5;
const MAX_ATTEMPTS = 3;

/** Claim one QUEUED capture (CAS on status). Null when the queue is empty. */
async function claimNext(): Promise<Capture | null> {
  const found = await sql<Capture[]>`
    SELECT id, "tenantId", slug, "chatroomId", "streamStartedAt"
    FROM "ChatCapture"
    WHERE status = 'QUEUED' AND "endedAt" IS NULL AND attempts < ${MAX_ATTEMPTS}
    ORDER BY "createdAt" ASC LIMIT 1`;
  if (found.length === 0) return null;
  const cap = found[0];
  const claim = await sql`
    UPDATE "ChatCapture"
    SET status = 'RECORDING', "claimedAt" = now(), attempts = attempts + 1
    WHERE id = ${cap.id} AND status = 'QUEUED'`;
  return claim.count === 1 ? cap : null; // lost the race → next tick
}

/**
 * Recover captures whose worker died, and close out ones whose stream ended
 * without the recorder noticing. A half-recorded stream still keeps its
 * buckets — partial chat is a usable signal, it just covers less of the VOD.
 */
async function reapStale(): Promise<void> {
  const requeued = await sql`
    UPDATE "ChatCapture" SET status = 'QUEUED', "claimedAt" = NULL
    WHERE status = 'RECORDING' AND "endedAt" IS NULL
      AND "claimedAt" < now() - interval '5 minutes'
      AND attempts < ${MAX_ATTEMPTS}`;
  if (requeued.count > 0) console.info(`[chat] requeued ${requeued.count} dropped capture(s)`);
  // Ended, or beyond any plausible stream length, or out of attempts → done.
  const closed = await sql`
    UPDATE "ChatCapture" SET status = 'DONE'
    WHERE status IN ('QUEUED', 'RECORDING')
      AND ("endedAt" IS NOT NULL
           OR "streamStartedAt" < now() - interval '20 hours'
           OR (attempts >= ${MAX_ATTEMPTS} AND "claimedAt" < now() - interval '5 minutes'))`;
  if (closed.count > 0) console.info(`[chat] closed ${closed.count} finished capture(s)`);
}

async function flush(cap: Capture, acc: BucketAccumulator): Promise<void> {
  const rows = acc.drain();
  for (const row of rows) {
    await sql`
      INSERT INTO "ChatBucket" ("captureId", minute, counts)
      VALUES (${cap.id}, ${row.minute}, ${row.counts})
      ON CONFLICT ("captureId", minute) DO UPDATE SET counts = EXCLUDED.counts`;
  }
  await sql`
    UPDATE "ChatCapture" SET messages = ${acc.total}, "claimedAt" = now()
    WHERE id = ${cap.id}`;
}

/** True once the stream-end webhook (or an operator) has closed this capture. */
async function shouldStop(id: string): Promise<boolean> {
  const rows = await sql<{ ended: Date | null; status: string }[]>`
    SELECT "endedAt" AS ended, status FROM "ChatCapture" WHERE id = ${id}`;
  if (rows.length === 0) return true; // row deleted — nothing to record for
  return rows[0].ended !== null || rows[0].status === "DONE";
}

/**
 * One Pusher connection. Resolves when the socket closes for any reason; the
 * caller decides whether to reconnect. Never rejects — a dead socket is a
 * normal event over a multi-hour stream, not an error.
 */
function connectOnce(
  channel: string,
  startedAtMs: number,
  acc: BucketAccumulator,
  isStopped: () => boolean
): Promise<{ reason: string; messages: number }> {
  return new Promise((resolve) => {
    let settled = false;
    let received = 0;
    let lastActivity = Date.now();
    let ws: WebSocket;
    try {
      ws = new WebSocket(pusherUrl());
    } catch (e) {
      resolve({ reason: `socket open failed: ${e instanceof Error ? e.message : e}`, messages: 0 });
      return;
    }

    const done = (reason: string) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      try {
        ws.close();
      } catch {
        /* already closing */
      }
      resolve({ reason, messages: received });
    };

    const timer = setInterval(() => {
      if (isStopped()) return done("stream ended");
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) return done("idle timeout");
      // Pusher drops clients that go quiet; a ping also proves the link is up.
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(pingFrame());
        } catch {
          done("send failed");
        }
      }
    }, 30_000);

    ws.addEventListener("open", () => {
      lastActivity = Date.now();
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      lastActivity = Date.now();
      if (typeof ev.data !== "string") return;
      const frame = parseFrame(ev.data, Date.now());
      if (!frame) return;
      switch (frame.kind) {
        case "established":
          ws.send(subscribeFrame(channel));
          break;
        case "subscribed":
          console.info(`[chat] subscribed to ${frame.channel}`);
          break;
        case "ping":
          ws.send(pongFrame());
          break;
        case "message":
          received += 1;
          acc.add((frame.at - startedAtMs) / 1000);
          break;
        case "error":
          console.warn(`[chat] pusher error ${frame.code ?? "?"}: ${frame.message}`);
          if (frame.code !== null && frame.code >= 4000 && frame.code < 4100) {
            done(`pusher refused: ${frame.message}`); // 4000-4099 = don't retry
          }
          break;
        default:
          break;
      }
    });

    ws.addEventListener("error", () => {
      // The close event carries the detail; this only exists so an error can't
      // surface as an unhandled event.
      lastActivity = Date.now();
    });
    ws.addEventListener("close", (ev) => {
      // Typed structurally: Node's global WebSocket ships without a CloseEvent
      // type, and the code is all we log.
      done(`socket closed (${(ev as { code?: number }).code ?? "?"})`);
    });
  });
}

/**
 * Record one stream end to end: resolve the chatroom, hold the socket (through
 * reconnects), flush on a timer, and close the capture out when the stream ends.
 */
async function record(cap: Capture): Promise<void> {
  const acc = new BucketAccumulator();
  const startedAtMs = cap.streamStartedAt.getTime();
  const deadline = Date.now() + MAX_SESSION_MS;
  let stopped = false;

  try {
    let chatroomId = cap.chatroomId;
    if (!chatroomId) {
      const resolved = await resolveChatroomId(cap.slug);
      if (!resolved) {
        // Not fatal to the product — clips still get cut, just without the
        // chat signal. Requeue: kick.com blocks are often transient.
        await sql`
          UPDATE "ChatCapture"
          SET status = 'QUEUED', "claimedAt" = NULL, error = 'chatroom lookup failed'
          WHERE id = ${cap.id}`;
        console.warn(`[chat] ${cap.slug}: chatroom lookup failed — will retry`);
        return;
      }
      chatroomId = String(resolved);
      await sql`UPDATE "ChatCapture" SET "chatroomId" = ${chatroomId} WHERE id = ${cap.id}`;
    }

    const channel = chatChannel(chatroomId);
    console.info(`[chat] recording ${cap.slug} → ${channel}`);
    const flusher = setInterval(() => {
      void flush(cap, acc).catch((e) => console.warn("[chat] flush failed:", e));
      void shouldStop(cap.id).then((s) => {
        if (s) stopped = true;
      }).catch(() => {});
    }, FLUSH_MS);

    try {
      let backoffMs = 2000;
      while (!stopped && Date.now() < deadline) {
        const { reason, messages } = await connectOnce(channel, startedAtMs, acc, () => stopped);
        if (stopped) break;
        if (reason.startsWith("pusher refused")) {
          await sql`UPDATE "ChatCapture" SET error = ${reason} WHERE id = ${cap.id}`;
          break;
        }
        console.info(`[chat] ${cap.slug}: ${reason} after ${messages} msgs — reconnecting`);
        // A connection that carried traffic proves the channel works, so reset
        // the backoff; only repeated instant failures should slow down.
        backoffMs = messages > 0 ? 2000 : Math.min(backoffMs * 2, 60_000);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    } finally {
      clearInterval(flusher);
    }

    await flush(cap, acc);
    await sql`
      UPDATE "ChatCapture"
      SET status = 'DONE', "endedAt" = COALESCE("endedAt", now()), messages = ${acc.total}
      WHERE id = ${cap.id}`;
    console.info(`[chat] ${cap.slug}: captured ${acc.total} messages`);
  } catch (e) {
    // Bank whatever we have before surrendering the claim — a failed capture
    // with 40 minutes of chat still beats no chat at all.
    await flush(cap, acc).catch(() => {});
    const msg = e instanceof Error ? e.message : String(e);
    await sql`
      UPDATE "ChatCapture" SET status = 'QUEUED', "claimedAt" = NULL, error = ${msg}
      WHERE id = ${cap.id} AND status = 'RECORDING'`;
    console.error(`[chat] ${cap.slug} failed:`, msg);
  }
}

/**
 * The clip poller owns schema creation; this poller just waits for it rather
 * than racing it at boot and spraying "relation does not exist" into the log.
 */
async function waitForTable(name: string): Promise<void> {
  for (;;) {
    // ::text on the argument too — an untyped parameter leaves Postgres
    // unable to pick to_regclass's overload on some servers.
    const [{ present }] = await sql<{ present: string | null }[]>`
      SELECT to_regclass(${`public."${name}"`}::text)::text AS present`;
    if (present) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function runChatRecorder(intervalMs = 10_000): Promise<void> {
  await waitForTable("ChatCapture");
  const active = new Set<string>();
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      stop = true;
    });
  }
  console.info("[chat] recorder polling for live streams…");
  let tick = 0;
  while (!stop) {
    try {
      if (tick++ % 6 === 0) await reapStale(); // ~every minute at 10s interval
      if (active.size < MAX_CONCURRENT) {
        const cap = await claimNext();
        if (cap && !active.has(cap.id)) {
          active.add(cap.id);
          // Deliberately not awaited: recording runs for the whole broadcast
          // while the loop keeps claiming other channels.
          void record(cap).finally(() => active.delete(cap.id));
        }
      }
    } catch (e) {
      console.error("[chat] poll error:", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.info("[chat] recorder stopped");
}
