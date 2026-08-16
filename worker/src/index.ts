/**
 * Worker entrypoint: run two DB-queue pollers side by side —
 *  - clip poller: QUEUED streams → cut clips
 *  - publish poller: approved clips → post to socials (via provider, e.g. Blotato)
 */
import { runPoller } from "./poll.ts";
import { runPublishPoller } from "./publish/poller.ts";

Promise.all([runPoller(), runPublishPoller()]).catch((e) => {
  console.error("[winclipz-worker] fatal:", e);
  process.exit(1);
});
