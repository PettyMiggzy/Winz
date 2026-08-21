/**
 * Worker entrypoint: run the DB-queue pollers side by side —
 *  - clip poller:    QUEUED streams → cut clips
 *  - publish poller: approved clips → post to socials
 *  - dub poller:     approved clips → translated (same-voice) variants
 *  - chat recorder:  live Kick chat → per-second velocity for clip scoring
 */
import { runPoller } from "./poll.ts";
import { runPublishPoller } from "./publish/poller.ts";
import { runDubPoller } from "./dub/poller.ts";
import { runChatRecorder } from "./chat/recorder.ts";

/**
 * Each loop is supervised on its own. These jobs are independent — a chat
 * recorder that can't reach Kick has no bearing on whether clips get cut — so
 * one crashing must not take the process down with it and strand the others.
 * Promise.all did exactly that: any single rejection killed all four.
 */
const LOOPS = [
  ["clip", runPoller],
  ["publish", runPublishPoller],
  ["dub", runDubPoller],
  ["chat", runChatRecorder],
] as const;

for (const [name, start] of LOOPS) {
  start().catch((e) => {
    console.error(`[winclipz-worker] ${name} loop crashed:`, e instanceof Error ? e.message : e);
    console.error(`[winclipz-worker] other loops keep running; restart the worker to bring ${name} back.`);
  });
}
