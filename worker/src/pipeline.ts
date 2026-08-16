/**
 * Job handler: run a recorded stream through the clip engine, music-gate the
 * outputs, and hand them off to publish. The engine (worker/engine) does the
 * heavy lifting — transcribe → audio + chat signals → LLM quote-boundary
 * scoring → frame-accurate render → manifest.json.
 */

import { join } from "node:path";
import { processVideo, type Manifest } from "../engine/index.ts";
import { detectMusic } from "./music.ts";
import { config } from "./config.ts";
import type { ProcessStreamJob } from "./types.ts";

export async function processStream(job: ProcessStreamJob): Promise<Manifest> {
  const outDir = join(config.workDir, job.tenantId, job.streamId);

  const manifest = await processVideo(job.sourcePath, outDir, {
    styleHint: job.styleHint ?? (job.channelSlug ? `Kick streamer ${job.channelSlug}` : undefined),
    chatTimestamps: job.chatTimestamps,
    maxClipSec: 60, // hard platform cap (Shorts > 60s + music claim = blocked)
    layout: "crop",
    onProgress: (stage, detail) =>
      console.info(`[engine:${job.streamId}] ${stage}${detail ? ": " + detail : ""}`),
  });

  // Music safety gate before anything is queued to publish.
  for (const clip of manifest.clips) {
    const verdict = await detectMusic(clip.file);
    if (verdict.action === "skip") {
      manifest.dropped.push({ title: clip.title, reason: `music flagged (${verdict.track ?? "unknown"})` });
    }
    // TODO: persist surviving clips (status PENDING) and enqueue a publish job
    // per assigned account, applying the warm-up ramp cadence.
  }

  return manifest;
}
