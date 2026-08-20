/**
 * Worker entrypoint: run the DB-queue pollers side by side —
 *  - clip poller:    QUEUED streams → cut clips
 *  - publish poller: approved clips → post to socials
 *  - dub poller:     approved clips → translated (same-voice) variants
 */
import { runPoller } from "./poll.ts";
import { runPublishPoller } from "./publish/poller.ts";
import { runDubPoller } from "./dub/poller.ts";

Promise.all([runPoller(), runPublishPoller(), runDubPoller()]).catch((e) => {
  console.error("[winclipz-worker] fatal:", e);
  process.exit(1);
});
