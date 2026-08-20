/**
 * Chat velocity storage. Kick chat is high-volume — a busy stream is thousands
 * of messages an hour — but the clip engine only cares about *how many* arrived
 * each second, never what they said. So we store per-second counts grouped into
 * minute-sized rows: a 12-hour stream is 720 small rows instead of ~500k
 * message rows, and nothing user-written is retained.
 */

export const SECONDS_PER_BUCKET = 60;
/** Refuse offsets beyond this — a bad clock shouldn't be able to eat memory. */
export const MAX_OFFSET_SEC = 24 * 3600;
/** Ceiling on timestamps handed to the detector (~30 msg/s over 12h). */
const MAX_TIMESTAMPS = 1_500_000;

export interface ChatBucketRow {
  minute: number;
  counts: number[];
}

/**
 * Accumulates message offsets into minute buckets and reports which buckets
 * changed since the last drain.
 *
 * Buckets are kept in full for the whole session and re-written on every flush,
 * so a flush is an idempotent overwrite (`counts = EXCLUDED.counts`). Writing
 * the same minute twice with a more complete array is harmless; a partial write
 * followed by a crash leaves a truthful — if slightly short — final minute.
 */
export class BucketAccumulator {
  private readonly buckets = new Map<number, number[]>();
  private readonly dirty = new Set<number>();
  private count = 0;

  /** Record one message at `offsetSec` seconds from stream start. */
  add(offsetSec: number): void {
    if (!Number.isFinite(offsetSec) || offsetSec < 0 || offsetSec > MAX_OFFSET_SEC) return;
    const sec = Math.floor(offsetSec);
    const minute = Math.floor(sec / SECONDS_PER_BUCKET);
    let counts = this.buckets.get(minute);
    if (!counts) {
      counts = new Array(SECONDS_PER_BUCKET).fill(0);
      this.buckets.set(minute, counts);
    }
    counts[sec % SECONDS_PER_BUCKET] += 1;
    this.dirty.add(minute);
    this.count += 1;
  }

  /** Total messages recorded this session. */
  get total(): number {
    return this.count;
  }

  /** Buckets touched since the last drain, oldest first. Clears the dirty set. */
  drain(): ChatBucketRow[] {
    const rows: ChatBucketRow[] = [];
    for (const minute of [...this.dirty].sort((a, b) => a - b)) {
      rows.push({ minute, counts: [...(this.buckets.get(minute) ?? [])] });
    }
    this.dirty.clear();
    return rows;
  }
}

/**
 * Expand stored buckets back into the flat second-offset list the detector
 * wants. It re-buckets by second internally, so emitting `n` copies of second
 * `s` reproduces the original counts exactly.
 */
export function bucketsToTimestamps(rows: ChatBucketRow[]): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const base = row.minute * SECONDS_PER_BUCKET;
    for (let i = 0; i < row.counts.length; i++) {
      const n = row.counts[i];
      for (let k = 0; k < n && out.length < MAX_TIMESTAMPS; k++) out.push(base + i);
    }
  }
  return out;
}

/**
 * Fraction of recorded chat that lands inside the video's timeline.
 *
 * Chat offsets are measured from Kick's `started_at`; the VOD is *assumed* to
 * begin at the same instant. That assumption is the whole alignment — if Kick
 * trims the VOD's head, or the stream reconnected mid-session and the VOD only
 * covers the tail, every offset is wrong and the signal points the engine at
 * the wrong moments. Wrong anchors are worse than none, so the caller gates on
 * this and drops the signal rather than guessing an offset.
 */
export function chatCoverage(rows: ChatBucketRow[], durationSec: number): number {
  let inside = 0;
  let total = 0;
  for (const row of rows) {
    const base = row.minute * SECONDS_PER_BUCKET;
    for (let i = 0; i < row.counts.length; i++) {
      const n = row.counts[i];
      if (n === 0) continue;
      total += n;
      if (base + i < durationSec) inside += n;
    }
  }
  return total === 0 ? 0 : inside / total;
}

/** Below this share of chat inside the video timeline, the signal is discarded. */
export const MIN_COVERAGE = 0.5;
/** Fewer messages than this and the z-scores are noise, not hype. */
export const MIN_MESSAGES = 200;

export interface ChatSignal {
  timestamps: number[];
  /** Why the signal was dropped, for the job log. Null when usable. */
  rejected: string | null;
  messages: number;
  coverage: number;
}

/** Turn stored buckets into a usable signal, or an explained rejection. */
export function buildChatSignal(rows: ChatBucketRow[], durationSec: number): ChatSignal {
  const messages = rows.reduce((sum, r) => sum + r.counts.reduce((a, b) => a + b, 0), 0);
  const coverage = chatCoverage(rows, durationSec);
  if (messages < MIN_MESSAGES) {
    return { timestamps: [], rejected: `only ${messages} messages captured`, messages, coverage };
  }
  if (coverage < MIN_COVERAGE) {
    return {
      timestamps: [],
      rejected: `only ${(coverage * 100).toFixed(0)}% of chat falls inside the ${Math.round(durationSec)}s video — VOD and chat clocks disagree`,
      messages,
      coverage,
    };
  }
  return { timestamps: bucketsToTimestamps(rows), rejected: null, messages, coverage };
}
