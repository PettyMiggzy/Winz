/**
 * Chat-velocity highlight signal. Messages-per-second spikes mark hype moments.
 * Chat reacts AFTER the moment (~5-20s lag, LIGHTOR paper) so spikes are shifted
 * backward before they become clip anchors (docs/research/05).
 */

import { detectPeaks, type Peak } from "./audio.js";

/** Bin message timestamps (seconds) into per-second counts over [0, durationSec). */
export function messagesPerSecond(timestamps: number[], durationSec: number): number[] {
  const n = Math.max(0, Math.ceil(durationSec));
  const counts = new Array(n).fill(0);
  for (const t of timestamps) {
    const i = Math.floor(t);
    if (i >= 0 && i < n) counts[i] += 1;
  }
  return counts;
}

/**
 * Detect chat spikes and shift them backward by lagSec so the anchor lands on
 * the moment that caused the reaction, not the reaction itself.
 */
export function detectChatSpikes(
  timestamps: number[],
  {
    durationSec,
    zThreshold = 2.5,
    minGapSec = 8,
    lagSec = 8,
  }: { durationSec: number; zThreshold?: number; minGapSec?: number; lagSec?: number }
): Peak[] {
  const counts = messagesPerSecond(timestamps, durationSec);
  const peaks = detectPeaks(counts, { hz: 1, zThreshold, minGapSec });
  return peaks.map((p) => ({ z: p.z, tSec: Math.max(0, p.tSec - lagSec) }));
}
