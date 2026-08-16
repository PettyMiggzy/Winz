/** Worker entrypoint: consume process-stream jobs and run the clip pipeline. */
import { makeWorker } from "./queue.js";
import { processStream } from "./pipeline.js";

const worker = makeWorker(async (job) => {
  console.info(`[winz-worker] processing stream ${job.streamId} (tenant ${job.tenantId})`);
  const manifest = await processStream(job);
  console.info(`[winz-worker] produced ${manifest.clips.length} clips for ${job.streamId} (${manifest.dropped.length} dropped)`);
  return { clips: manifest.clips.length };
});

worker.on("failed", (job, err) => {
  console.error(`[winz-worker] job ${job?.id} failed:`, err.message);
});

console.info("[winz-worker] up — waiting for jobs");

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    console.info(`[winz-worker] ${sig} — draining`);
    await worker.close();
    process.exit(0);
  });
}
