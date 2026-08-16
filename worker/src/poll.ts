/**
 * DB-as-queue consumer. Polls Postgres for QUEUED streams, claims one
 * atomically (compare-and-swap on status), downloads the source from R2, runs
 * the clip engine, writes the clips back, and marks the stream DONE/FAILED.
 *
 * Using the DB as the queue keeps the stack Redis-free — one fewer service to
 * run. Raw SQL against Prisma's default table/column names (PascalCase model,
 * camelCase columns), so no cross-directory Prisma generation is needed here.
 */

import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";
import { processVideo } from "../engine/index.ts";
import { detectMusic } from "./music.ts";
import { config } from "./config.ts";

const sql = postgres(process.env.DATABASE_URL ?? "", { max: 4 });

interface QueuedStream {
  id: string;
  tenantId: string;
  sourceUrl: string | null;
  title: string;
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
    UPDATE "Stream" SET status = 'PROCESSING'
    WHERE id = ${s.id} AND status = 'QUEUED'`;
  return claim.count === 1 ? s : null; // lost the race → try again next tick
}

async function processOne(s: QueuedStream): Promise<void> {
  if (!s.sourceUrl) throw new Error("stream has no sourceUrl");
  const dir = await mkdtemp(join(tmpdir(), "winclipz-"));
  const input = join(dir, "source.mp4");
  try {
    const res = await fetch(s.sourceUrl);
    if (!res.ok) throw new Error(`fetch source ${res.status}`);
    await writeFile(input, Buffer.from(await res.arrayBuffer()));

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
      await sql`
        INSERT INTO "Clip"
          (id, "tenantId", "streamId", title, hook, "durationSec", score, signal,
           "flaggedMusic", "storageKey", "startMs", "endMs")
        VALUES (${crypto.randomUUID()}, ${s.tenantId}, ${s.id}, ${c.title}, ${c.caption},
           ${Math.round(c.end - c.start)}, ${Math.round(c.score)}, ${c.category},
           ${music.flagged}, ${c.file}, ${Math.round(c.start * 1000)}, ${Math.round(c.end * 1000)})`;
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
  console.info("[winclipz-worker] polling for QUEUED streams…");
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => { stop = true; });
  }
  while (!stop) {
    try {
      const s = await claimNext();
      if (s) await processOne(s);
      else await new Promise((r) => setTimeout(r, intervalMs));
    } catch (e) {
      console.error("[winclipz-worker] poll error:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  await sql.end();
  console.info("[winclipz-worker] stopped");
}
