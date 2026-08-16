/**
 * Audio-energy highlight signal. Pure math over an RMS/loudness series.
 * Relative baselines (per-stream z-score), never absolute dB — absolute
 * thresholds false-positive on game music (docs/research/05).
 */

export interface Peak {
  tSec: number;
  z: number;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function std(xs: number[], mu = mean(xs)): number {
  if (xs.length < 2) return 0;
  const v = xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

/** Per-series z-scores. Zero-variance series → all zeros (no div-by-zero). */
export function zscores(series: number[]): number[] {
  const mu = mean(series);
  const sd = std(series, mu);
  if (sd === 0) return series.map(() => 0);
  return series.map((x) => (x - mu) / sd);
}

/**
 * Detect peaks in an evenly-sampled series.
 * @param series  RMS/energy values
 * @param hz      samples per second (e.g. 1 for 1s windows)
 * @param zThreshold  minimum z-score to count as a peak
 * @param minGapSec   suppress peaks closer than this to a stronger one
 */
export function detectPeaks(
  series: number[],
  { hz = 1, zThreshold = 2, minGapSec = 8 }: { hz?: number; zThreshold?: number; minGapSec?: number } = {}
): Peak[] {
  const z = zscores(series);
  const candidates: Peak[] = [];
  for (let i = 0; i < z.length; i++) {
    if (z[i] < zThreshold) continue;
    // local maximum vs immediate neighbours
    if ((i > 0 && z[i] < z[i - 1]) || (i < z.length - 1 && z[i] < z[i + 1])) continue;
    candidates.push({ tSec: i / hz, z: z[i] });
  }
  return suppressClose(candidates, minGapSec);
}

/** Greedy non-max suppression: keep strongest peaks, drop any within minGap. */
export function suppressClose(peaks: Peak[], minGapSec: number): Peak[] {
  const sorted = [...peaks].sort((a, b) => b.z - a.z);
  const kept: Peak[] = [];
  for (const p of sorted) {
    if (kept.every((k) => Math.abs(k.tSec - p.tSec) >= minGapSec)) kept.push(p);
  }
  return kept.sort((a, b) => a.tSec - b.tSec);
}
