// TikTok publish state machine. Uploading bytes is not publishing: TikTok
// processes asynchronously and rejects often enough (format, duration, spam
// risk, revoked auth) that treating the upload receipt as success would
// sometimes tell a creator their clip is live when it isn't.
import { interpretStatus, postUrl } from "../src/publish/tiktok.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

const st = (data, error) => interpretStatus({ data, error });

// --- still working ---
ok("upload in progress stays pending", st({ status: "PROCESSING_UPLOAD" }).state === "pending");
ok("download in progress stays pending", st({ status: "PROCESSING_DOWNLOAD" }).state === "pending");

// An unrecognised status must never read as success — a status we can't
// interpret is not evidence the post went live.
ok("an unknown status is not success", st({ status: "SOMETHING_NEW" }).state === "pending");
ok("an empty response is not success", st({}).state === "pending");

// --- published ---
const done = st({ status: "PUBLISH_COMPLETE", publicaly_available_post_id: [7300000000000000000] });
ok("publish complete is a success", done.state === "posted");
ok("captures the real post id", done.postId === "7300000000000000000");
ok("public posts aren't marked inbox", done.inbox === false);

// TikTok's docs carry the typo; tolerate a corrected spelling too.
ok("accepts the corrected field spelling",
  st({ status: "PUBLISH_COMPLETE", publicly_available_post_id: [42] }).postId === "42");

// Private/unlisted posts are real successes with no shareable link.
const noId = st({ status: "PUBLISH_COMPLETE" });
ok("a post without an id is still posted", noId.state === "posted" && noId.postId === null);

const inbox = st({ status: "SEND_TO_USER_INBOX" });
ok("draft mode's inbox delivery is a success", inbox.state === "posted");
ok("inbox delivery is flagged as such", inbox.inbox === true);

// --- rejected ---
const rejected = st({ status: "FAILED", fail_reason: "spam_risk_too_many_posts" });
ok("a rejection is a failure", rejected.state === "failed");
ok("keeps TikTok's own reason", rejected.reason === "spam_risk_too_many_posts");
ok("a reasonless failure still explains itself",
  st({ status: "FAILED" }).reason.length > 0);

const errored = st(undefined, { code: "access_token_invalid", message: "token expired" });
ok("an API error is a failure", errored.state === "failed");
ok("the API error names the code", /access_token_invalid/.test(errored.reason));
ok("ok is not an error", st({ status: "PUBLISH_COMPLETE" }, { code: "ok" }).state === "posted");

// --- links ---
ok("builds a watch url", postUrl("kingpetty", "123") === "https://www.tiktok.com/@kingpetty/video/123");
ok("tolerates a stored @ prefix", postUrl("@kingpetty", "123").includes("@kingpetty/video/123"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
