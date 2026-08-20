import type { PrismaClient } from "@prisma/client";
import { rampCapForDay, daysSince } from "@/lib/ramp";

/**
 * Posting scheduler.
 *
 * Approving ten clips shouldn't fire ten posts at an account in one afternoon —
 * that's the pattern platforms flag, and it burns a week of content in an hour.
 * Instead each account gets a daily allowance (its warm-up ramp), posts inside a
 * day are spaced out, and anything over the allowance rolls to following days.
 * The result is a queue that drips content out on a human cadence.
 */

const MIN_GAP_MIN = 90; // never two posts closer than this on one account
const JITTER_MIN = 30; // randomised on top, so the cadence isn't clockwork
// Posting window, UTC. Roughly US afternoon → late evening, when short-form
// engagement peaks. (Per-creator timezones aren't modelled yet — when they are,
// this window should follow the creator's local time.)
const WINDOW_START_H = 15;
const WINDOW_END_H = 3; // next day; the window wraps past midnight

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** First allowed posting time on a given day. */
function windowOpen(day: Date): Date {
  const x = startOfDayUtc(day);
  x.setUTCHours(WINDOW_START_H, 0, 0, 0);
  return x;
}

/** Last allowed posting time for a day (window wraps into the next morning). */
function windowClose(day: Date): Date {
  const x = startOfDayUtc(day);
  x.setUTCDate(x.getUTCDate() + 1);
  x.setUTCHours(WINDOW_END_H, 0, 0, 0);
  return x;
}

const jitterMs = () => Math.floor(Math.random() * JITTER_MIN) * 60_000;

export interface SlotPlan {
  accountId: string;
  scheduledFor: Date;
}

/**
 * Plan when each of `accountIds` should post one clip, honouring per-account
 * daily caps and spacing. Returns one slot per account.
 */
export async function planSlots(
  prisma: PrismaClient,
  accounts: { id: string; connectedAt: Date | null }[],
  tierMax: number,
  now: Date = new Date()
): Promise<SlotPlan[]> {
  const plans: SlotPlan[] = [];

  for (const account of accounts) {
    // Everything already queued or sent for this account, from today onward.
    const existing = await prisma.post.findMany({
      where: {
        accountId: account.id,
        status: { not: "FAILED" },
        OR: [
          { scheduledFor: { gte: startOfDayUtc(now) } },
          { postedAt: { gte: startOfDayUtc(now) } },
        ],
      },
      select: { scheduledFor: true, postedAt: true },
    });
    const taken = existing
      .map((p) => p.scheduledFor ?? p.postedAt)
      .filter((d): d is Date => d != null)
      .sort((a, b) => a.getTime() - b.getTime());

    plans.push({
      accountId: account.id,
      scheduledFor: findSlot(taken, account.connectedAt, tierMax, now),
    });
  }
  return plans;
}

/**
 * Walk forward a day at a time until one has room under that day's ramp cap,
 * then place the post after the last one with a gap. Exported for testing.
 */
export function findSlot(
  taken: Date[],
  connectedAt: Date | null,
  tierMax: number,
  now: Date = new Date()
): Date {
  const warmupDay = connectedAt ? daysSince(connectedAt, now.getTime()) : 999;

  for (let offset = 0; offset < 30; offset++) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() + offset);
    const open = windowOpen(day);
    const close = windowClose(day);

    const cap = rampCapForDay(warmupDay + offset, tierMax);
    if (cap <= 0) continue; // account still in its hold period

    const onThisDay = taken.filter((t) => t >= open && t < close);
    if (onThisDay.length >= cap) continue; // day is full — try tomorrow

    // Earliest we may post: window open, never in the past, and a full gap
    // after whatever is already scheduled on this account.
    const last = onThisDay[onThisDay.length - 1];
    let candidate = new Date(Math.max(open.getTime(), now.getTime()));
    if (last) {
      const afterLast = new Date(last.getTime() + MIN_GAP_MIN * 60_000);
      if (afterLast > candidate) candidate = afterLast;
    }
    candidate = new Date(candidate.getTime() + jitterMs());
    if (candidate < close) return candidate;
    // Spilled past the window — fall through to the next day.
  }
  // Pathological (30 days of full capacity): just queue it a month out rather
  // than dropping the post on the floor.
  const fallback = new Date(now);
  fallback.setUTCDate(fallback.getUTCDate() + 30);
  return fallback;
}
