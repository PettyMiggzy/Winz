// Unit test for the warm-up ramp policy. Run: npm test
import { rampCapForDay, daysSince, warmupPercent, warmupStateFor, WARMUP_DAYS } from "../src/lib/ramp.ts";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (got === want) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, `got ${got} want ${want}`); }
};

// ramp curve
eq("day 0 holds (0/day)", rampCapForDay(0), 0);
eq("day 1 → 1/day", rampCapForDay(1), 1);
eq("day 3 → 1/day", rampCapForDay(3), 1);
eq("day 5 → 2/day", rampCapForDay(5), 2);
eq("day 10 → 3/day", rampCapForDay(10), 3);
eq("day 20 → tier cap (default 4)", rampCapForDay(20), 4);
eq("day 20 respects tier cap 6", rampCapForDay(20, 6), 6);

// daysSince
const now = Date.parse("2026-08-16T00:00:00Z");
eq("daysSince 5 days ago", daysSince("2026-08-11T00:00:00Z", now), 5);
eq("daysSince null → 0", daysSince(null, now), 0);
eq("daysSince future → 0", daysSince("2026-09-01T00:00:00Z", now), 0);

// percent + state
eq("warmupPercent day 7 ~ 50", warmupPercent(7), 50);
eq("warmupPercent caps at 100", warmupPercent(999), 100);
eq("state new when unconnected", warmupStateFor(null, now), "new");
eq("state warming mid-ramp", warmupStateFor("2026-08-13T00:00:00Z", now), "warming");
eq("state ready after WARMUP_DAYS", warmupStateFor(new Date(now - (WARMUP_DAYS + 1) * 86400000), now), "ready");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
