/**
 * Account warm-up + posting-ramp policy.
 *
 * The risk with new social accounts is in creation and early activity, not in
 * API posting itself. So once an account is connected, Winz ramps posting up
 * slowly instead of blasting from day one — this mirrors safe human behavior
 * and protects the account. Creation/warm-up happens on the user's own phone;
 * this policy governs how fast the automation is allowed to post afterward.
 */

export type WarmupState = "new" | "warming" | "ready";

/** Days of automated warm-up before an account reaches full posting cadence. */
export const WARMUP_DAYS = 14;

/**
 * Max automated posts/day for an account, as a function of how many days it has
 * been warming. Ramps 0 → 1 → 2 → 3 → tier cap over ~2 weeks.
 */
export function rampCapForDay(day: number, tierMax = 4): number {
  if (day < 1) return 0; // just connected — hold for a day
  if (day <= 3) return 1;
  if (day <= 7) return 2;
  if (day <= WARMUP_DAYS) return 3;
  return tierMax;
}

/** Whole days elapsed since a timestamp (0 if in the future/undefined). */
export function daysSince(date: Date | string | null | undefined, now: number = Date.now()): number {
  if (!date) return 0;
  const t = typeof date === "string" ? Date.parse(date) : date.getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** 0–100 warm-up completion for a progress bar. */
export function warmupPercent(day: number): number {
  return Math.min(100, Math.round((day / WARMUP_DAYS) * 100));
}

/** Resolve the current warm-up state from connection + elapsed days. */
export function warmupStateFor(connectedAt: Date | string | null | undefined, now: number = Date.now()): WarmupState {
  if (!connectedAt) return "new";
  return daysSince(connectedAt, now) >= WARMUP_DAYS ? "ready" : "warming";
}

export const WARMUP_STEPS: { day: string; label: string }[] = [
  { day: "Day 0", label: "Connect the account to Winz" },
  { day: "Days 1–3", label: "1 auto-post/day — easing in" },
  { day: "Days 4–7", label: "2 auto-posts/day" },
  { day: "Days 8–14", label: "3 auto-posts/day" },
  { day: "Day 15+", label: "Full cadence for your plan" },
];
