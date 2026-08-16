import { buildEncodeArgs, clampDuration, PLATFORM_SPECS, assertEven } from "../src/ffmpeg/encode.ts";
import { layoutFilter, buildFilterComplex, escapeDrawtext, OUT_W, OUT_H } from "../src/ffmpeg/layouts.ts";
import { buildRenderArgs } from "../src/ffmpeg/render.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };

// encode
const yt = buildEncodeArgs("youtube");
ok("encode uses libx264 high", yt.includes("libx264") && yt.includes("high"));
ok("encode forces yuv420p", yt.includes("yuv420p"));
ok("encode faststart", yt.includes("+faststart"));
ok("encode aac 48k", yt.includes("aac") && yt.includes("48000"));
ok("youtube fps 60", yt[yt.indexOf("-r") + 1] === "60");
ok("clampDuration caps at 60", clampDuration(240, "tiktok") === 60);
ok("clampDuration floors at 1", clampDuration(0, "tiktok") === 1);
ok("all specs are 1080x1920", Object.values(PLATFORM_SPECS).every((s) => s.width === 1080 && s.height === 1920));

let threw = false;
try { assertEven(1081, 1920); } catch { threw = true; }
ok("assertEven rejects odd", threw);
ok("assertEven accepts even", (() => { try { assertEven(1080, 1920); return true; } catch { return false; } })());

// layouts
ok("crop outputs [base]", layoutFilter("crop").includes("[base]"));
ok("crop targets 1080x1920", layoutFilter("crop").includes(`crop=${OUT_W}:${OUT_H}`));
ok("blur uses boxblur not gblur", layoutFilter("blur").includes("boxblur") && !layoutFilter("blur").includes("gblur"));
ok("stack uses vstack", layoutFilter("stack").includes("vstack"));

const noCap = buildFilterComplex({ layout: "crop", watermark: "kick.com/WinslowBankz" });
ok("no captions → out label [wm]", noCap.outLabel === "[wm]");
ok("watermark centered vertically", noCap.filterComplex.includes("y=(h-text_h)/2"));
const withCap = buildFilterComplex({ layout: "blur", watermark: "kick.com/x", assPath: "/tmp/s.ass" });
ok("captions → out label [out]", withCap.outLabel === "[out]" && withCap.filterComplex.includes("ass="));
ok("drawtext escapes colon", escapeDrawtext("kick.com/x:y").includes("\\:"));

// render args
const args = buildRenderArgs({ input: "in.mp4", output: "out.mp4", startSec: 100, endSec: 130, platform: "tiktok", layout: "crop", watermark: "kick.com/x" });
ok("render trims with -ss/-t", args.includes("-ss") && args.includes("-t"));
ok("render keeps a 30s window", args[args.indexOf("-t") + 1] === "30.000");
const longArgs = buildRenderArgs({ input: "in.mp4", output: "out.mp4", startSec: 100, endSec: 200, platform: "tiktok", layout: "crop", watermark: "kick.com/x" });
ok("render caps a 100s window at 60", longArgs[longArgs.indexOf("-t") + 1] === "60.000");
ok("render maps optional audio", args.includes("0:a?"));
ok("render input before filter", args.indexOf("-i") < args.indexOf("-filter_complex"));
ok("render ends with output path", args[args.length - 1] === "out.mp4");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
