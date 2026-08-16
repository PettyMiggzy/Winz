import { zscores, detectPeaks, suppressClose, mean, std } from "../src/detect/audio.ts";
import { messagesPerSecond, detectChatSpikes } from "../src/detect/chat.ts";
import { buildCandidates } from "../src/detect/fusion.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };

// audio
ok("mean basic", mean([2, 4, 6]) === 4);
ok("std of constant is 0", std([5, 5, 5]) === 0);
ok("zscores of constant → zeros", zscores([3, 3, 3]).every((z) => z === 0));
const series = [1, 1, 1, 1, 9, 1, 1, 1, 1]; // spike at index 4
const peaks = detectPeaks(series, { hz: 1, zThreshold: 2, minGapSec: 3 });
ok("detects the spike at t=4", peaks.length === 1 && peaks[0].tSec === 4);
ok("no peaks in flat series", detectPeaks([2, 2, 2, 2], { zThreshold: 2 }).length === 0);
// non-max suppression keeps the stronger, drops the close one
const sup = suppressClose([{ tSec: 10, z: 3 }, { tSec: 12, z: 5 }, { tSec: 40, z: 4 }], 8);
ok("suppression keeps stronger of close pair", sup.length === 2 && sup.some((p) => p.tSec === 12) && !sup.some((p) => p.tSec === 10));

// chat
const mps = messagesPerSecond([0.2, 0.9, 5.5, 5.6, 5.9], 8);
ok("mps bins per second", mps[0] === 2 && mps[5] === 3 && mps.length === 8);
const spikes = detectChatSpikes([...Array(50)].map((_, i) => 30 + i * 0.02), { durationSec: 60, zThreshold: 2, lagSec: 8 });
ok("chat spike shifted backward by lag", spikes.length >= 1 && spikes[0].tSec < 30);

// fusion
const cands = buildCandidates(
  [
    { tSec: 100, weight: 3, kind: "audio" },
    { tSec: 105, weight: 4, kind: "chat" }, // overlaps the audio window → merge
    { tSec: 400, weight: 2, kind: "audio" },
  ],
  { streamDurationSec: 600, preSec: 12, postSec: 12, minClipSec: 10, maxClipSec: 45 }
);
ok("overlapping peaks merge into one candidate", cands.length === 2);
const top = cands[0];
ok("merged score sums signals", top.score === 7);
ok("merged candidate lists both signals", top.signals.includes("audio") && top.signals.includes("chat"));
ok("clip length within max", cands.every((c) => c.endSec - c.startSec <= 45 + 0.001));
ok("candidates ranked by score desc", cands[0].score >= cands[1].score);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
