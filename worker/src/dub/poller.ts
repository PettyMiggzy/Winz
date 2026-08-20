/**
 * Dub poller. Watches for QUEUED Dub rows (created when a clip is approved and
 * the workspace has dub languages configured), sends the clip to ElevenLabs,
 * waits for the dub, stores it in R2, and creates a NEW Clip row for it — so a
 * dubbed clip flows through review → approve → post like any other clip.
 *
 * Same DB-as-queue pattern as the other pollers: CAS claim, heartbeat, bounded
 * attempts, visibility timeout for workers that die mid-job.
 */
import crypto from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "../db.ts";
import { r2Configured, uploadFile, publicUrl } from "../r2.ts";
import { dubbingConfigured, startDub, dubStatus, downloadDub, DUB_LANGUAGES } from "./elevenlabs.ts";

const MAX_ATTEMPTS = 2; // dubbing costs money — don't retry endlessly
const POLL_MS = 15_000;
const MAX_WAIT_MS = 15 * 60_000; // ElevenLabs is usually done in ~1-3 min for a short clip

interface DueDub {
  id: string;
  tenantId: string;
  clipId: string;
  lang: string;
  externalId: string | null;
  attempts: number | null;
  clipTitle: string;
  clipHook: string | null;
  storageKey: string | null;
  streamId: string;
  durationSec: number;
  score: number;
}

async function claimNext(): Promise<DueDub | null> {
  const rows = await sql<DueDub[]>`
    SELECT d.id, d."tenantId", d."clipId", d.lang, d."externalId", d.attempts,
           c.title AS "clipTitle", c.hook AS "clipHook", c."storageKey",
           c."streamId", c."durationSec", c.score
    FROM "Dub" d
    JOIN "Clip" c ON c.id = d."clipId"
    WHERE d.status = 'QUEUED'
    ORDER BY d."createdAt" ASC
    LIMIT 1`;
  if (rows.length === 0) return null;
  const d = rows[0];
  const claim = await sql`
    UPDATE "Dub" SET status = 'PROCESSING', "claimedAt" = now(), attempts = attempts + 1
    WHERE id = ${d.id} AND status = 'QUEUED'`;
  return claim.count === 1 ? d : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function processOne(d: DueDub): Promise<void> {
  try {
    if (!d.storageKey || d.storageKey.startsWith("/")) {
      throw new Error("source clip isn't in cloud storage — can't dub it");
    }

    // Reuse an in-flight ElevenLabs job on retry instead of paying twice.
    let dubbingId = d.externalId;
    if (!dubbingId) {
      dubbingId = await startDub({
        mediaUrl: publicUrl(d.storageKey),
        targetLang: d.lang,
        name: `${d.clipTitle} (${d.lang})`,
      });
      await sql`UPDATE "Dub" SET "externalId" = ${dubbingId} WHERE id = ${d.id}`;
      console.info(`[dub ${d.id}] started → ${d.lang} (${dubbingId})`);
    }

    // Wait for it, heartbeating the claim so the reaper leaves us alone.
    const deadline = Date.now() + MAX_WAIT_MS;
    let done = false;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      await sql`UPDATE "Dub" SET "claimedAt" = now() WHERE id = ${d.id} AND status = 'PROCESSING'`;
      const st = await dubStatus(dubbingId);
      if (st.status === "dubbed") { done = true; break; }
      if (st.status === "failed") throw new Error(`elevenlabs failed: ${st.error ?? "unknown"}`);
    }
    if (!done) throw new Error("dub timed out after 15 min");

    // Fetch the dubbed video and store it alongside the original.
    const bytes = await downloadDub(dubbingId, d.lang);
    const dubClipId = crypto.randomUUID();
    const key = `clips/${d.tenantId}/${d.streamId}/${dubClipId}-${d.lang}.mp4`;
    const tmp = await mkdtemp(join(tmpdir(), "winclipz-dub-"));
    const localPath = join(tmp, "dub.mp4");
    try {
      await writeFile(localPath, bytes);
      if (!r2Configured) throw new Error("R2 not configured — nowhere to store the dub");
      await uploadFile(key, localPath, "video/mp4");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }

    // A dub is a real clip: it goes to the review queue on its own merits.
    const label = DUB_LANGUAGES[d.lang] ?? d.lang.toUpperCase();
    await sql`
      INSERT INTO "Clip"
        (id, "tenantId", "streamId", title, hook, "durationSec", score, signal,
         "storageKey", lang, "sourceClipId", status)
      VALUES (${dubClipId}, ${d.tenantId}, ${d.streamId},
              ${`${d.clipTitle} (${label})`}, ${d.clipHook}, ${d.durationSec},
              ${d.score}, ${`dubbed to ${label}`}, ${key}, ${d.lang}, ${d.clipId}, 'PENDING')`;
    await sql`UPDATE "Dub" SET status = 'DONE', "dubClipId" = ${dubClipId} WHERE id = ${d.id}`;
    console.info(`[dub ${d.id}] done — ${label} clip ready for review`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const attempts = (d.attempts ?? 0) + 1;
    const terminal = attempts >= MAX_ATTEMPTS;
    await sql`
      UPDATE "Dub" SET status = ${terminal ? "FAILED" : "QUEUED"}, "claimedAt" = NULL,
                       error = ${msg.slice(0, 500)}
      WHERE id = ${d.id} AND status = 'PROCESSING'`;
    console.error(`[dub ${d.id}] ${terminal ? "failed" : "will retry"}: ${msg}`);
  }
}

/** Requeue dubs whose worker died (visibility timeout). */
async function reapStale(): Promise<void> {
  const r = await sql`
    UPDATE "Dub" SET status = 'QUEUED', "claimedAt" = NULL
    WHERE status = 'PROCESSING' AND "claimedAt" < now() - interval '25 minutes'
      AND attempts < ${MAX_ATTEMPTS}`;
  if (r.count > 0) console.info(`[winclipz-worker] requeued ${r.count} stale dub(s)`);
}

export async function runDubPoller(intervalMs = 10_000): Promise<void> {
  if (!dubbingConfigured()) {
    console.info("[winclipz-worker] ELEVENLABS_API_KEY not set — dub poller idle (clips aren't translated).");
    return;
  }
  console.info("[winclipz-worker] dub poller watching for approved clips to translate…");
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => { stop = true; });
  let tick = 0;
  while (!stop) {
    try {
      if (tick++ % 30 === 0) await reapStale();
      const d = await claimNext();
      if (d) await processOne(d);
      else await sleep(intervalMs);
    } catch (e) {
      console.error("[winclipz-worker] dub poll error:", e instanceof Error ? e.message : e);
      await sleep(intervalMs);
    }
  }
  console.info("[winclipz-worker] dub poller stopped");
}
