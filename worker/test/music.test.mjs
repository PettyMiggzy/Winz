// Music screening verdicts. This decides whether a creator is shown a clip as
// safe, so the failure mode that matters is a lookup that didn't happen being
// reported as one that came back clean.
import { interpretAudD } from "../src/music.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

// --- clean: the lookup ran and found nothing ---
const nullResult = interpretAudD({ status: "success", result: null }, "flag");
ok("no match is clean", nullResult.flagged === false && nullResult.action === "clean");
ok("no match counts as screened", nullResult.checked === true);
// AudD returns an empty array for no-match too, depending on the endpoint.
ok("an empty array is also no match", interpretAudD({ status: "success", result: [] }, "flag").checked === true);

// --- unknown: never allowed to look clean ---
const quota = interpretAudD({ error: { error_code: 901, error_message: "limit reached" } }, "flag");
ok("a quota error is not a clean result", quota.checked === false);
ok("a quota error doesn't flag either", quota.flagged === false);
ok("a bad token is not a clean result",
  interpretAudD({ error: { error_code: 900 } }, "flag").checked === false);
ok("a non-success status is not clean",
  interpretAudD({ status: "error" }, "flag").checked === false);
ok("an empty response is not clean", interpretAudD({}, "flag").checked === false);
// A match it can't name is useless as a warning and false as a pass.
ok("a nameless match is unknown, not clean",
  interpretAudD({ status: "success", result: { artist: "", title: "" } }, "flag").checked === false);

// --- flagged ---
const hit = interpretAudD(
  { status: "success", result: { artist: "Drake", title: "Hotline Bling", album: "Views" } },
  "flag"
);
ok("a match is flagged", hit.flagged === true);
ok("a match counts as screened", hit.checked === true);
ok("names the track for the creator", hit.track === "Drake — Hotline Bling");
ok("flag policy keeps the clip", hit.action === "flag");

ok("skip policy drops the clip",
  interpretAudD({ status: "success", result: { artist: "A", title: "B" } }, "skip").action === "skip");
ok("policy only applies to hits", nullResult.action === "clean");

// Partial metadata still produces a usable label.
ok("a title-only match still names something",
  interpretAudD({ status: "success", result: { title: "Untitled Demo" } }, "flag").track === "Untitled Demo");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
