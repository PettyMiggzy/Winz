// Posting-scheduler policy: daily caps, spacing, and overflow to later days.
// Run: npm test
import { findSlot } from "../src/server/schedule.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

// A fixed "now" so the assertions don't drift with the clock. 12:00 UTC, well
// before the 15:00 posting window opens.
const now = new Date("2026-03-10T12:00:00Z");
const READY = new Date("2025-01-01T00:00:00Z"); // long past warm-up

const hoursBetween = (a, b) => Math.abs(b.getTime() - a.getTime()) / 3_600_000;
const sameUtcDay = (a, b) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

// --- empty schedule ---
const first = findSlot([], READY, 4, now);
ok("first post lands today", sameUtcDay(first, now));
ok("first post waits for the window to open", first.getUTCHours() >= 15);
ok("first post is never in the past", first > now);

// --- spacing ---
const existing = new Date("2026-03-10T16:00:00Z");
const spaced = findSlot([existing], READY, 4, now);
ok("second post is >= 90 min after the first", hoursBetween(existing, spaced) >= 1.5);

// --- daily cap → roll to the next day ---
const fullDay = [
  new Date("2026-03-10T15:00:00Z"),
  new Date("2026-03-10T17:00:00Z"),
  new Date("2026-03-10T19:00:00Z"),
  new Date("2026-03-10T21:00:00Z"),
];
const overflow = findSlot(fullDay, READY, 4, now);
ok("a full day pushes the post to a later day", !sameUtcDay(overflow, now));
ok("the overflow post still respects the window", overflow.getUTCHours() >= 15 || overflow.getUTCHours() < 3);

// --- warm-up caps bite harder than the tier cap ---
// Connected today: day 0 holds entirely, so the first slot must be a later day.
const brandNew = findSlot([], now, 4, now);
ok("a just-connected account doesn't post on day 0", !sameUtcDay(brandNew, now));

// Day 2 of warm-up allows exactly 1/day, so one existing post fills it.
const dayTwo = new Date(now.getTime() - 2 * 86_400_000);
const warming = findSlot([new Date("2026-03-10T16:00:00Z")], dayTwo, 4, now);
ok("a warming account's 1/day cap pushes the 2nd post to tomorrow",
  !sameUtcDay(warming, now));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
