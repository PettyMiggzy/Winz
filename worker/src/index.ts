/** Worker entrypoint: poll Postgres for QUEUED streams and run the clip engine. */
import { runPoller } from "./poll.ts";

runPoller().catch((e) => {
  console.error("[winclipz-worker] fatal:", e);
  process.exit(1);
});
