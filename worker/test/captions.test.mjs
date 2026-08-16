import { assTime, groupWords, buildAss } from "../src/ffmpeg/captions.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };

// assTime
ok("assTime 0 → 0:00:00.00", assTime(0) === "0:00:00.00");
ok("assTime 65.5 → 0:01:05.50", assTime(65.5) === "0:01:05.50");
ok("assTime clamps negative", assTime(-3) === "0:00:00.00");

// groupWords
const words = [
  { text: "down", start: 0, end: 0.4 },
  { text: "one", start: 0.4, end: 0.7 },
  { text: "v", start: 0.7, end: 0.9 },
  { text: "four", start: 0.9, end: 1.3 },
  { text: "then", start: 1.4, end: 1.7 },
  { text: "this", start: 1.7, end: 2.1 },
];
const lines = groupWords(words, 4, 2.5);
ok("groups by max 4 words", lines[0].length === 4);
ok("second line has remainder", lines[1].length === 2);

// buildAss
const ass = buildAss(words);
ok("sets PlayResX 1080", ass.includes("PlayResX: 1080"));
ok("sets PlayResY 1920", ass.includes("PlayResY: 1920"));
ok("defines Winz style", ass.includes("Style: Winz,"));
ok("has karaoke \\k tags", ass.includes("{\\k"));
ok("uppercases by default", ass.includes("DOWN"));
ok("emits a Dialogue line", ass.includes("Dialogue: 0,0:00:00.00,"));
ok("empty words → header only, no Dialogue", !buildAss([]).includes("Dialogue:"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
