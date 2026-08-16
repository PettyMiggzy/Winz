/**
 * BullMQ queue definitions. The web app enqueues "process-stream" jobs when a
 * Kick stream ends; this worker consumes them. Retries + backoff are built in;
 * jobs must be idempotent (docs/research/07).
 */

import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { config } from "./config.js";
import type { ProcessStreamJob } from "./types.js";

export const QUEUE_NAME = "winz:process-stream";

const connection: ConnectionOptions = { url: config.redisUrl };

export function makeQueue() {
  return new Queue<ProcessStreamJob>(QUEUE_NAME, { connection });
}

export function makeWorker(handler: (job: ProcessStreamJob) => Promise<unknown>) {
  return new Worker<ProcessStreamJob>(
    QUEUE_NAME,
    async (job) => handler(job.data),
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
    }
  );
}

export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: { age: 604_800 },
};
