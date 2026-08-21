/**
 * DB-as-queue consumer. Polls Postgres for QUEUED streams, claims one
 * atomically (compare-and-swap on status), downloads the source from R2, runs
 * the clip engine, writes the clips back, and marks the stream DONE/FAILED.
 *
 * Using the DB as the queue keeps the stack Redis-free — one fewer service to
 * run. Raw SQL against Prisma's default table/column names (PascalCase model,
 * camelCase columns), so no cross-directory Prisma generation is needed here.
 */

import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { processVideo } from "../engine/index.ts";
import { probeDuration } from "../engine/ffmpeg.ts";
import { buildChatSignal, type ChatBucketRow } from "./chat/buckets.ts";
import { resolveLatestVod } from "./kickweb.ts";
import { detectMusic, musicScreeningEnabled } from "./music.ts";
import { config } from "./config.ts";
import { r2Configured, uploadFile } from "./r2.ts";
import { downloadSource } from "./download.ts";
import { sql } from "./db.ts";

// prepare:false — Neon's pooled endpoint (PgBouncer, transaction mode) rejects
// named prepared statements. Disabling them lets the worker use either the
// pooled or the direct connection string without errors.
interface QueuedStream {
  id: string;
  tenantId: string;
  sourceUrl: string | null;
  title: string;
  clipLayout: string | null;
  facecam: string | null;
  chatCaptureId: string | null;
  startedAt: Date;
}

/**
 * A Kick stream ended but its VOD isn't published yet, so the webhook enqueued
 * the channel instead of a URL. The worker resolves it — kick.com blocks
 * datacenter IPs, and only the worker has the residential proxy.
 */
const KICK_LATEST = "kick-latest:";
/** How long to keep waiting for Kick to publish a VOD before giving up. */
const VOD_WAIT_LIMIT_MS = 3 * 3600_000;
const VOD_RETRY_MIN = 5;

/** Parse the stored "x,y,w,h" facecam rect; null when unset or malformed. */
function parseFacecam(raw: string | null): { x: number; y: number; w: number; h: number } | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return undefined;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return undefined;
  return { x, y, w, h };
}

/**
 * The shared migration file sits at the repo root in development and is copied
 * next to the app in the container, so try both rather than pinning a layout.
 */
async function readMigrations(): Promise<string> {
  const candidates = ["../../prisma/migrations.sql", "../prisma/migrations.sql"];
  for (const rel of candidates) {
    try {
      return await readFile(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
    } catch {
      /* try the next layout */
    }
  }
  throw new Error("prisma/migrations.sql not found — the image is missing it");
}

/**
 * Create the schema in whatever database this worker is actually connected to,
 * if it isn't there yet. This sidesteps multi-branch / multi-project confusion:
 * the tables always land in the DB the worker uses. Idempotent — skips when the
 * "Stream" table already exists.
 */
async function ensureSchema(): Promise<void> {
  const [{ present }] = await sql<{ present: string | null }[]>`
    SELECT to_regclass('public."Stream"')::text AS present`;
  if (!present) {
    console.info("[winclipz-worker] no tables found — creating schema…");
    const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
    const ddl = await readFile(schemaPath, "utf8");
    await sql.unsafe(ddl).simple(); // multiple statements → simple protocol
    console.info("[winclipz-worker] schema created.");
  }
  // One shared file, run by the worker here and by the web app at build time
  // (scripts/migrate.mjs). Keeping them in sync by hand is how the dashboard
  // ends up asking for a column that only the worker knows about.
  await sql.unsafe(await readMigrations()).simple();

  // Enum values stay here: ALTER TYPE ... ADD VALUE is rejected inside a
  // transaction block on some servers, so it needs the simple protocol on its
  // own. Non-fatal — a worker that can't add the value should still cut clips.
  try {
    await sql.unsafe(`ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'PROCESSING'`).simple();
  } catch (e) {
    console.warn("[winclipz-worker] could not add PostStatus.PROCESSING:", e instanceof Error ? e.message : e);
  }
  // Recover jobs orphaned by container restarts before claimedAt existed.
  const legacy = await sql`
    UPDATE "Stream" SET status = 'QUEUED'
    WHERE status = 'PROCESSING' AND "claimedAt" IS NULL`;
  if (legacy.count > 0) console.info(`[winclipz-worker] requeued ${legacy.count} orphaned job(s)`);
}

const MAX_ATTEMPTS = 3;

/**
 * Requeue jobs whose worker died mid-processing (deploy restarts, OOM). A job
 * whose claim heartbeat (claimedAt, refreshed during processing) is >20 min
 * stale is presumed dead. Jobs past MAX_ATTEMPTS are marked FAILED instead of
 * looping forever and starving the queue.
 */
async function reapStale(): Promise<void> {
  const dead = await sql`
    UPDATE "Stream" SET status = 'FAILED'
    WHERE status = 'PROCESSING'
      AND "claimedAt" < now() - interval '20 minutes'
      AND "attempts" >= ${MAX_ATTEMPTS}`;
  if (dead.count > 0) console.warn(`[winclipz-worker] gave up on ${dead.count} job(s) past ${MAX_ATTEMPTS} attempts`);
  const requeued = await sql`
    UPDATE "Stream" SET status = 'QUEUED', "claimedAt" = NULL
    WHERE status = 'PROCESSING' AND "claimedAt" < now() - interval '20 minutes'`;
  if (requeued.count > 0) console.info(`[winclipz-worker] requeued ${requeued.count} stale job(s)`);

  // Same visibility-timeout recovery for stuck publish jobs (publish is fast —
  // a POSTING row older than 10 min means the worker died mid-send).
  const posts = await sql`
    UPDATE "Post" SET status = 'SCHEDULED', "claimedAt" = NULL
    WHERE status = 'POSTING' AND "claimedAt" < now() - interval '10 minutes'
      AND "attempts" < ${MAX_ATTEMPTS}`;
  if (posts.count > 0) console.info(`[winclipz-worker] requeued ${posts.count} stuck post(s)`);
  const deadPosts = await sql`
    UPDATE "Post" SET status = 'FAILED'
    WHERE status = 'POSTING' AND "claimedAt" < now() - interval '10 minutes'
      AND "attempts" >= ${MAX_ATTEMPTS}`;
  if (deadPosts.count > 0) console.warn(`[winclipz-worker] gave up on ${deadPosts.count} stuck post(s)`);
}

/** Claim the oldest QUEUED stream (CAS on status). Returns null if none. */
async function claimNext(): Promise<QueuedStream | null> {
  const found = await sql<QueuedStream[]>`
    SELECT s.id, s."tenantId", s."sourceUrl", s.title, s."chatCaptureId", s."startedAt",
           t."clipLayout", t.facecam
    FROM "Stream" s JOIN "Tenant" t ON t.id = s."tenantId"
    WHERE s.status = 'QUEUED'
      AND (s."notBefore" IS NULL OR s."notBefore" <= now())
    ORDER BY s."startedAt" ASC LIMIT 1`;
  if (found.length === 0) return null;
  const s = found[0];
  const claim = await sql`
    UPDATE "Stream" SET status = 'PROCESSING', "claimedAt" = now(),
                       "attempts" = "attempts" + 1
    WHERE id = ${s.id} AND status = 'QUEUED'`;
  return claim.count === 1 ? s : null; // lost the race → try again next tick
}

/**
 * Load the chat recorded while this stream was live and turn it into detector
 * input, or explain why it can't be used. Returns an empty list on any doubt:
 * chat anchored to the wrong offsets would aim the engine at the wrong
 * moments, which is worse than having no chat signal at all.
 */
async function loadChatSignal(s: QueuedStream, durationSec: number): Promise<number[]> {
  if (!s.chatCaptureId) return [];
  const rows = await sql<ChatBucketRow[]>`
    SELECT minute, counts FROM "ChatBucket"
    WHERE "captureId" = ${s.chatCaptureId} ORDER BY minute ASC`;
  const signal = buildChatSignal(rows, durationSec);
  if (signal.rejected) {
    console.warn(`[${s.id}] chat signal unused — ${signal.rejected}`);
    return [];
  }
  console.info(`[${s.id}] chat signal: ${signal.messages} messages over the broadcast`);
  return signal.timestamps;
}

/**
 * Turn a `kick-latest:<slug>` placeholder into a real VOD URL. Kick publishes
 * the VOD minutes after the stream ends, so "not there yet" is the normal
 * first answer — the job goes back on the queue with a delay instead of
 * failing. Returns null when it has been requeued (or abandoned).
 */
async function resolvePendingVod(s: QueuedStream): Promise<string | null> {
  const slug = (s.sourceUrl ?? "").slice(KICK_LATEST.length);
  const vod = slug ? await resolveLatestVod(slug) : null;
  if (vod) {
    await sql`UPDATE "Stream" SET "sourceUrl" = ${vod} WHERE id = ${s.id}`;
    console.info(`[${s.id}] resolved VOD for ${slug}: ${vod}`);
    return vod;
  }
  const waited = Date.now() - new Date(s.startedAt).getTime();
  if (waited > VOD_WAIT_LIMIT_MS) {
    await sql`UPDATE "Stream" SET status = 'FAILED' WHERE id = ${s.id} AND status = 'PROCESSING'`;
    console.warn(`[${s.id}] no VOD for ${slug} after ${Math.round(waited / 60000)} min — giving up`);
    return null;
  }
  // Not a real attempt — undo the claim's increment so waiting on Kick can't
  // burn through the retry budget.
  await sql`
    UPDATE "Stream"
    SET status = 'QUEUED', "claimedAt" = NULL, attempts = GREATEST(attempts - 1, 0),
        "notBefore" = now() + make_interval(mins => ${VOD_RETRY_MIN})
    WHERE id = ${s.id} AND status = 'PROCESSING'`;
  console.info(`[${s.id}] VOD for ${slug} not published yet — retrying in ${VOD_RETRY_MIN} min`);
  return null;
}

async function processOne(s: QueuedStream): Promise<void> {
  if (!s.sourceUrl) throw new Error("stream has no sourceUrl");
  let sourceUrl = s.sourceUrl;
  if (sourceUrl.startsWith(KICK_LATEST)) {
    const vod = await resolvePendingVod(s);
    if (!vod) return; // requeued with a delay, or abandoned
    sourceUrl = vod;
  }
  const dir = await mkdtemp(join(tmpdir(), "winclipz-"));
  const input = join(dir, "source.mp4");
  try {
    // Direct fetch for uploaded files; yt-dlp for YouTube/Kick/Twitch links.
    await downloadSource(sourceUrl, input);

    const outDir = join(config.workDir, s.tenantId, s.id);
    const layout = (s.clipLayout ?? "crop") as "crop" | "blurpad" | "split";
    const chatTimestamps = await loadChatSignal(s, await probeDuration(input));
    const manifest = await processVideo(input, outDir, {
      styleHint: s.title,
      maxClipSec: 60,
      layout,
      facecam: parseFacecam(s.facecam),
      chatTimestamps,
      onProgress: (stage, d) => {
        console.info(`[${s.id}] ${stage}${d ? ": " + d : ""}`);
        // Heartbeat the claim so a legitimately long job isn't reaped as dead.
        void sql`UPDATE "Stream" SET "claimedAt" = now() WHERE id = ${s.id} AND status = 'PROCESSING'`.catch(() => {});
      },
    });

    for (const c of manifest.clips) {
      const music = await detectMusic(c.file);
      if (music.action === "skip") {
        console.warn(`[${s.id}] dropped "${c.title}" — MUSIC_POLICY=skip and it contains ${music.track}`);
        continue;
      }
      const clipId = crypto.randomUUID();
      // Upload the rendered mp4 to R2 so it's durable + web-servable; store the
      // R2 key. Without R2 configured, fall back to the local path (dev only —
      // the file won't survive a restart, but the clip row still appears).
      let storageKey = c.file;
      if (r2Configured) {
        storageKey = `clips/${s.tenantId}/${s.id}/${clipId}.mp4`;
        await uploadFile(storageKey, c.file, "video/mp4");
      } else {
        console.warn(`[${s.id}] R2 not configured — clip saved locally only: ${c.file}`);
      }
      await sql`
        INSERT INTO "Clip"
          (id, "tenantId", "streamId", title, hook, "durationSec", score, signal,
           "flaggedMusic", "musicChecked", "musicTrack", "storageKey", "startMs", "endMs")
        VALUES (${clipId}, ${s.tenantId}, ${s.id}, ${c.title}, ${c.caption},
           ${Math.round(c.end - c.start)}, ${Math.round(c.score)}, ${c.category},
           ${music.flagged}, ${music.checked}, ${music.track ?? null},
           ${storageKey}, ${Math.round(c.start * 1000)}, ${Math.round(c.end * 1000)})`;
    }
    // Guard the terminal write with status='PROCESSING' so a reaped-and-reclaimed
    // job can't have its result clobbered by the original (now-zombie) worker.
    await sql`UPDATE "Stream" SET status = 'DONE' WHERE id = ${s.id} AND status = 'PROCESSING'`;
    console.info(`[${s.id}] done — ${manifest.clips.length} clips`);
  } catch (e) {
    await sql`UPDATE "Stream" SET status = 'FAILED' WHERE id = ${s.id} AND status = 'PROCESSING'`;
    console.error(`[${s.id}] failed:`, e instanceof Error ? e.message : e);
  } finally {
    await rm(dir, { recursive: true, force: true });
    // Remove rendered outputs once uploaded to R2 — otherwise WORK_DIR fills up.
    if (r2Configured) await rm(join(config.workDir, s.tenantId, s.id), { recursive: true, force: true });
  }
}

export async function runPoller(intervalMs = 5000): Promise<void> {
  // Log which DB host we're on (no credentials) so DB mismatches are obvious.
  try {
    const host = new URL(process.env.DATABASE_URL ?? "").host;
    console.info(`[winclipz-worker] database host: ${host}`);
  } catch { /* ignore */ }
  console.info(
    r2Configured
      ? `[winclipz-worker] R2: configured (bucket ${process.env.R2_BUCKET})`
      : "[winclipz-worker] R2: NOT CONFIGURED — clips will be stranded on this worker's local disk!"
  );
  console.info(
    musicScreeningEnabled()
      ? "[winclipz-worker] music screening: on (AudD)"
      : "[winclipz-worker] music screening: OFF — set AUDD_API_KEY. Clips are NOT checked for copyrighted music; the review queue will say so per clip."
  );
  await ensureSchema();
  console.info("[winclipz-worker] polling for QUEUED streams…");
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => { stop = true; });
  }
  let tick = 0;
  while (!stop) {
    try {
      if (tick++ % 24 === 0) await reapStale(); // ~every 2 min at 5s interval
      const s = await claimNext();
      if (s) await processOne(s);
      else await new Promise((r) => setTimeout(r, intervalMs));
    } catch (e) {
      console.error("[winclipz-worker] poll error:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  console.info("[winclipz-worker] clip poller stopped");
}
