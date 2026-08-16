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
import { detectMusic } from "./music.ts";
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
  // Idempotent micro-migrations for columns newer than the base schema.
  await sql`ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "claimedAt" timestamptz`;
  await sql`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "meta" jsonb`;
  // Recover jobs orphaned by container restarts before claimedAt existed.
  const legacy = await sql`
    UPDATE "Stream" SET status = 'QUEUED'
    WHERE status = 'PROCESSING' AND "claimedAt" IS NULL`;
  if (legacy.count > 0) console.info(`[winclipz-worker] requeued ${legacy.count} orphaned job(s)`);
}

/**
 * Requeue jobs whose worker died mid-processing (deploy restarts, OOM). A job
 * claimed >2h ago that's still PROCESSING is presumed dead — safe for our
 * longest streams, and claims are CAS so a live worker can't double-claim.
 */
async function reapStale(): Promise<void> {
  const r = await sql`
    UPDATE "Stream" SET status = 'QUEUED', "claimedAt" = NULL
    WHERE status = 'PROCESSING' AND "claimedAt" < now() - interval '2 hours'`;
  if (r.count > 0) console.info(`[winclipz-worker] requeued ${r.count} stale job(s)`);
}

/** Claim the oldest QUEUED stream (CAS on status). Returns null if none. */
async function claimNext(): Promise<QueuedStream | null> {
  const found = await sql<QueuedStream[]>`
    SELECT id, "tenantId", "sourceUrl", title
    FROM "Stream" WHERE status = 'QUEUED'
    ORDER BY "startedAt" ASC LIMIT 1`;
  if (found.length === 0) return null;
  const s = found[0];
  const claim = await sql`
    UPDATE "Stream" SET status = 'PROCESSING', "claimedAt" = now()
    WHERE id = ${s.id} AND status = 'QUEUED'`;
  return claim.count === 1 ? s : null; // lost the race → try again next tick
}

async function processOne(s: QueuedStream): Promise<void> {
  if (!s.sourceUrl) throw new Error("stream has no sourceUrl");
  const dir = await mkdtemp(join(tmpdir(), "winclipz-"));
  const input = join(dir, "source.mp4");
  try {
    // Direct fetch for uploaded files; yt-dlp for YouTube/Kick/Twitch links.
    await downloadSource(s.sourceUrl, input);

    const outDir = join(config.workDir, s.tenantId, s.id);
    const manifest = await processVideo(input, outDir, {
      styleHint: s.title,
      maxClipSec: 60,
      layout: "crop",
      onProgress: (stage, d) => console.info(`[${s.id}] ${stage}${d ? ": " + d : ""}`),
    });

    for (const c of manifest.clips) {
      const music = await detectMusic(c.file);
      if (music.action === "skip") continue;
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
           "flaggedMusic", "storageKey", "startMs", "endMs")
        VALUES (${clipId}, ${s.tenantId}, ${s.id}, ${c.title}, ${c.caption},
           ${Math.round(c.end - c.start)}, ${Math.round(c.score)}, ${c.category},
           ${music.flagged}, ${storageKey}, ${Math.round(c.start * 1000)}, ${Math.round(c.end * 1000)})`;
    }
    await sql`UPDATE "Stream" SET status = 'DONE' WHERE id = ${s.id}`;
    console.info(`[${s.id}] done — ${manifest.clips.length} clips`);
  } catch (e) {
    await sql`UPDATE "Stream" SET status = 'FAILED' WHERE id = ${s.id}`;
    console.error(`[${s.id}] failed:`, e instanceof Error ? e.message : e);
  } finally {
    await rm(dir, { recursive: true, force: true });
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
