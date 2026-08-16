/**
 * Fuse per-signal peaks (audio, chat, transcript) into candidate clip windows.
 * Each peak seeds a window; overlapping windows merge and their scores combine,
 * so a moment backed by multiple signals ranks higher (docs/research/05).
 */

export type SignalKind = "audio" | "chat" | "transcript";

export interface SignalPeak {
  tSec: number;
  weight: number; // e.g. z-score or LLM score
  kind: SignalKind;
}

export interface Candidate {
  startSec: number;
  endSec: number;
  anchorSec: number;
  score: number;
  signals: SignalKind[];
  /** Weight of the single strongest peak backing this window (anchor owner). */
  anchorWeight: number;
}

export interface FusionOptions {
  preSec?: number; // window seconds before the anchor
  postSec?: number; // window seconds after the anchor
  minClipSec?: number;
  maxClipSec?: number;
  streamDurationSec: number;
}

/**
 * Build merged, scored, time-ordered candidate windows from raw signal peaks.
 */
export function buildCandidates(peaks: SignalPeak[], opts: FusionOptions): Candidate[] {
  const { preSec = 12, postSec = 12, minClipSec = 10, maxClipSec = 45, streamDurationSec } = opts;

  // Seed one window per peak, clamped to the stream.
  const seeds: Candidate[] = peaks
    .map((p) => {
      const start = clamp(p.tSec - preSec, 0, streamDurationSec);
      const end = clamp(p.tSec + postSec, 0, streamDurationSec);
      return {
        startSec: start,
        endSec: end,
        anchorSec: p.tSec,
        score: p.weight,
        signals: [p.kind],
        anchorWeight: p.weight,
      };
    })
    .filter((c) => c.endSec - c.startSec >= 1)
    .sort((a, b) => a.startSec - b.startSec);

  // Merge overlapping windows. The anchor follows the strongest INDIVIDUAL
  // peak (anchorWeight), compared before scores are summed — comparing against
  // the accumulated total would make the update unreachable.
  const merged: Candidate[] = [];
  for (const c of seeds) {
    const last = merged[merged.length - 1];
    if (last && c.startSec <= last.endSec) {
      last.endSec = Math.max(last.endSec, c.endSec);
      if (c.anchorWeight > last.anchorWeight) {
        last.anchorSec = c.anchorSec;
        last.anchorWeight = c.anchorWeight;
      }
      last.score += c.score;
      for (const s of c.signals) if (!last.signals.includes(s)) last.signals.push(s);
    } else {
      merged.push({ ...c, signals: [...c.signals] });
    }
  }

  // Enforce clip-length bounds around the anchor, then rank by score.
  return merged
    .map((c) => enforceLength(c, minClipSec, maxClipSec, streamDurationSec))
    .sort((a, b) => b.score - a.score);
}

function enforceLength(c: Candidate, minSec: number, maxSec: number, streamDur: number): Candidate {
  let { startSec, endSec, anchorSec } = c;
  const len = endSec - startSec;
  if (len > maxSec) {
    // Center the max-length window on the anchor.
    startSec = clamp(anchorSec - maxSec / 2, 0, streamDur);
    endSec = clamp(startSec + maxSec, 0, streamDur);
    startSec = clamp(endSec - maxSec, 0, streamDur);
  } else if (len < minSec) {
    const grow = (minSec - len) / 2;
    startSec = clamp(startSec - grow, 0, streamDur);
    endSec = clamp(startSec + minSec, 0, streamDur);
    startSec = clamp(endSec - minSec, 0, streamDur);
  }
  return { ...c, startSec, endSec };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
