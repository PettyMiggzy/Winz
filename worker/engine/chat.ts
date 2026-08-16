import type { EnergyPeak } from './types.ts';

/**
 * Chat-velocity spikes — the signal none of the off-the-shelf clippers use
 * (OpusClip/Vizard/Klap score on speech density, built for podcasts). On a Kick
 * stream, messages-per-second surging IS the hype detector.
 *
 * Chat reacts AFTER the moment it's reacting to (~5-20s lag), so each spike is
 * shifted backward by lagSec to anchor on the moment that caused it. Kick chat
 * comes off the Pusher WebSocket, which sits outside Cloudflare — cheap to
 * capture live. Returns the same {t, z} shape as audio-energy peaks so the
 * scorer treats both as evidence.
 */
export function detectChatSpikes(
  timestamps: number[],
  durationSec: number,
  opts: { zThreshold?: number; minGapSec?: number; lagSec?: number } = {},
): EnergyPeak[] {
  const { zThreshold = 2.5, minGapSec = 15, lagSec = 8 } = opts;
  const n = Math.max(0, Math.ceil(durationSec));
  if (n < 3 || timestamps.length === 0) return [];

  const counts = new Array(n).fill(0);
  for (const t of timestamps) {
    const i = Math.floor(t);
    if (i >= 0 && i < n) counts[i] += 1;
  }

  const mean = counts.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;

  const peaks: EnergyPeak[] = [];
  for (let i = 1; i < n - 1; i++) {
    const z = (counts[i] - mean) / sd;
    if (z < zThreshold) continue;
    if (counts[i] < counts[i - 1] || counts[i] < counts[i + 1]) continue; // local max
    const t = Math.max(0, i - lagSec); // shift back to the cause
    const last = peaks[peaks.length - 1];
    if (last && t - last.t < minGapSec) {
      if (z > last.z) peaks[peaks.length - 1] = { t, z };
      continue;
    }
    peaks.push({ t, z });
  }
  return peaks.sort((a, b) => b.z - a.z).slice(0, 15).sort((a, b) => a.t - b.t);
}
