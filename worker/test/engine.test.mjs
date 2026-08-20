// Runnable engine tests (no ffmpeg needed): chat-velocity + quote alignment.
// The full render/energy suite lives in worker/engine and needs an ffmpeg host.
import { detectChatSpikes } from "../engine/chat.ts";
import { findQuote, resolveMoments } from "../engine/index.ts";
import { buildGeometry } from "../engine/render.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

// --- chat velocity ---
ok("empty timestamps → no spikes", detectChatSpikes([], 120).length === 0);
ok("short duration → no spikes", detectChatSpikes([1, 1, 1], 2).length === 0);
// a flood at 60-62s over otherwise-quiet chat
const chat = [];
for (let t = 0; t < 120; t += 5) chat.push(t);           // baseline ~1 msg / 5s
for (let i = 0; i < 40; i++) chat.push(60 + Math.random() * 2); // flood at 60s
const spikes = detectChatSpikes(chat, 120, { lagSec: 8 });
ok("detects the chat flood", spikes.length >= 1);
ok("spike shifted back before the flood (lag)", spikes[0].t < 60 && spikes[0].t >= 50);

// --- quote → timestamp alignment ---
const words = "down one v four then he hits the insane clutch and chat goes crazy".split(" ")
  .map((t, i) => ({ text: t, start: i * 0.5, end: i * 0.5 + 0.4 }));
const transcript = { words, segments: [{ start: 0, end: words.length * 0.5, text: words.map(w => w.text).join(" ") }], duration: words.length * 0.5 + 1 };

ok("finds exact quote", (() => { const a = findQuote(words, "insane clutch"); return a && words[a.startIdx].text === "insane"; })());
ok("tolerates a transcription typo", (() => { const b = findQuote(words, "insan clutch"); return b && b.confidence >= 0.7; })());
ok("rejects an absent quote", findQuote(words, "banana helicopter zebra") === null);

const picks = [
  { start_quote: "down one", end_quote: "insane clutch", title: "clutch", caption: "", hashtags: [], category: "clutch", score: 90, reason: "" },
  { start_quote: "nope nope nope", end_quote: "gone", title: "bad", caption: "", hashtags: [], category: "other", score: 60, reason: "" },
];
const { resolved, dropped } = resolveMoments(picks, transcript, 6, 32, []);
ok("resolves a valid quote to a real window", resolved.length === 1 && resolved[0].end > resolved[0].start);
ok("drops a hallucinated quote instead of shipping it", dropped.some((d) => d.title === "bad"));
ok("timestamps come from alignment, not the model", resolved.every((c) => typeof c.matchConfidence === "number"));


// --- vertical framing geometry ---
const camRect = { x: 0.02, y: 0.62, w: 0.26, h: 0.34 };
const split = buildGeometry("split", camRect);
ok("split stacks two halves", split.includes("vstack=inputs=2"));
ok("split crops the marked facecam", split.includes("crop=iw*0.2600:ih*0.3400:iw*0.0200:ih*0.6200"));
ok("split halves total 1920px", split.includes("crop=1080:768") && split.includes("scale=1080:1152"));
// Guessing the cam position would frame the clip on the wrong thing, so an
// unconfigured split must fall back rather than emit a bogus crop.
ok("split without a facecam falls back to centre crop",
  buildGeometry("split", undefined) === buildGeometry("crop", undefined));
ok("crop is a centre cut to 9:16", buildGeometry("crop").includes("min(iw,ih*9/16)"));
ok("blurpad keeps the whole frame over a blur", buildGeometry("blurpad").includes("boxblur"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
