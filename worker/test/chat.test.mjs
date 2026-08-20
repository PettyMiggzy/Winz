// Chat-velocity capture tests: Pusher frame parsing, bucket storage, and the
// alignment gate that decides whether recorded chat may steer clip selection.
// No network, no database — every piece here is deliberately pure.
import { parseFrame, chatChannel, pusherUrl, CHAT_MESSAGE_EVENT } from "../src/chat/pusher.ts";
import {
  BucketAccumulator,
  bucketsToTimestamps,
  chatCoverage,
  buildChatSignal,
} from "../src/chat/buckets.ts";
import { detectChatSpikes } from "../engine/chat.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

// --- pusher frames ---
const NOW = 1_700_000_000_000;
ok("garbage is not a frame", parseFrame("not json", NOW) === null);
ok("frame without an event is ignored", parseFrame('{"data":"{}"}', NOW) === null);

const est = parseFrame(
  JSON.stringify({ event: "pusher:connection_established", data: JSON.stringify({ socket_id: "12.34", activity_timeout: 90 }) }),
  NOW
);
ok("reads the connection handshake", est.kind === "established" && est.socketId === "12.34");
ok("reads the activity timeout", est.activityTimeoutSec === 90);
ok("defaults the activity timeout when absent",
  parseFrame('{"event":"pusher:connection_established","data":"{}"}', NOW).activityTimeoutSec === 120);

ok("reads a subscription ack",
  parseFrame('{"event":"pusher_internal:subscription_succeeded","channel":"chatrooms.9.v2"}', NOW).channel === "chatrooms.9.v2");
ok("reads a ping", parseFrame('{"event":"pusher:ping","data":"{}"}', NOW).kind === "ping");

const err = parseFrame('{"event":"pusher:error","data":{"code":4001,"message":"app does not exist"}}', NOW);
ok("reads an error code", err.kind === "error" && err.code === 4001);
ok("carries the error message", err.message === "app does not exist");

// Pusher double-encodes: the outer frame's data is itself a JSON string.
const msg = parseFrame(
  JSON.stringify({ event: CHAT_MESSAGE_EVENT, channel: "chatrooms.9.v2", data: JSON.stringify({ id: "x", created_at: "2023-11-14T22:13:20.000Z", content: "LETS GOOO" }) }),
  NOW
);
ok("reads a chat message", msg.kind === "message");
ok("uses the message's own timestamp", msg.at === Date.parse("2023-11-14T22:13:20.000Z"));
ok("falls back to receive time when Kick omits created_at",
  parseFrame(JSON.stringify({ event: CHAT_MESSAGE_EVENT, data: "{}" }), NOW).at === NOW);
ok("survives an unparseable inner payload",
  parseFrame(JSON.stringify({ event: CHAT_MESSAGE_EVENT, data: "{not json" }), NOW).at === NOW);
ok("unknown events are inert", parseFrame('{"event":"App\\\\Events\\\\GiftedSubs"}', NOW).kind === "other");

ok("channel name matches Kick's shape", chatChannel(123456) === "chatrooms.123456.v2");
ok("socket url targets the pusher cluster", pusherUrl().startsWith("wss://ws-us2.pusher.com/app/"));

// --- bucket accumulation ---
const acc = new BucketAccumulator();
acc.add(0);
acc.add(0.9);   // same second
acc.add(61.2);  // minute 1, second 1
ok("counts messages", acc.total === 3);
ok("rejects a negative offset (clock skew)", (acc.add(-5), acc.total === 3));
ok("rejects an absurd offset", (acc.add(99 * 3600), acc.total === 3));

const drained = acc.drain();
ok("drains one row per touched minute", drained.length === 2);
ok("buckets by second within the minute", drained[0].counts[0] === 2);
ok("second minute holds its own count", drained[1].minute === 1 && drained[1].counts[1] === 1);
ok("drain clears the dirty set", acc.drain().length === 0);
acc.add(5);
const redrained = acc.drain();
ok("a re-touched minute is rewritten whole, not appended",
  redrained.length === 1 && redrained[0].counts[0] === 2 && redrained[0].counts[5] === 1);

// --- storage round-trip ---
const rows = [{ minute: 0, counts: Array.from({ length: 60 }, (_, i) => (i === 10 ? 3 : 0)) }];
const stamps = bucketsToTimestamps(rows);
ok("expands counts back into offsets", stamps.length === 3 && stamps.every((t) => t === 10));

// --- the alignment gate ---
// Chat offsets are measured from Kick's stream start and assumed to line up
// with the VOD. When they don't, the signal points the engine at the wrong
// moments — worse than no signal — so it must be refused, not rescaled.
const busy = (mins, perSec) =>
  Array.from({ length: mins }, (_, m) => ({ minute: m, counts: new Array(60).fill(perSec) }));

ok("full-coverage chat is usable", chatCoverage(busy(10, 1), 600) === 1);
ok("chat past the end of the video is counted as outside", chatCoverage(busy(10, 1), 300) === 0.5);
ok("empty chat has no coverage", chatCoverage([], 600) === 0);

const good = buildChatSignal(busy(20, 1), 1200);
ok("a well-aligned recording is accepted", good.rejected === null && good.timestamps.length === 1200);

const misaligned = buildChatSignal(busy(20, 1), 300);
ok("a misaligned recording is refused", misaligned.rejected !== null);
ok("refusal says why", /clocks disagree/.test(misaligned.rejected));
ok("refusal hands back no timestamps", misaligned.timestamps.length === 0);

const sparse = buildChatSignal(busy(2, 1), 3600);
ok("too little chat is refused rather than treated as signal", sparse.rejected !== null);
ok("sparse refusal reports the count", /120 messages/.test(sparse.rejected));

// --- capture → detector, end to end ---
// Quiet chat with a real eruption 30 minutes in: the recorded bucket must come
// back out as a spike anchored *before* the reaction that produced it.
const live = new BucketAccumulator();
for (let t = 0; t < 3600; t += 2) live.add(t);              // ~0.5 msg/s baseline
for (let i = 0; i < 300; i++) live.add(1800 + (i % 3));     // chat erupts at 30:00
const captured = live.drain();
const signal = buildChatSignal(captured, 3600);
ok("a real recording survives the gate", signal.rejected === null);
const spikes = detectChatSpikes(signal.timestamps, 3600);
ok("the eruption is detected", spikes.length >= 1);
const hit = spikes.find((s) => s.t >= 1780 && s.t <= 1800);
ok("the spike anchors on the moment, not the reaction", Boolean(hit));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
