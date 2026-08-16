import type { EnergyPeak } from './types.ts';
import { run } from './ffmpeg.ts';

/** Loudness spikes = shouting / laughter / hype. ebur128 logs momentary (M)
 *  loudness every ~100ms to stderr; we parse, smooth, z-score, and return
 *  local maxima. These go to the LLM as hints, not as a decision on their own. */
export async function detectEnergyPeaks(audioOrVideoPath: string): Promise<EnergyPeak[]> {
  const stderr = await run(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', audioOrVideoPath, '-filter:a', 'ebur128', '-f', 'null', '-'],
    { collectStderr: true },
  );

  const re = /t:\s*([\d.]+)\s+.*?M:\s*(-?[\d.]+)/g;
  const series: { t: number; m: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(stderr)) !== null) {
    const m = parseFloat(match[2]);
    if (m > -70) series.push({ t: parseFloat(match[1]), m }); // drop silence floor
  }
  if (series.length < 50) return [];

  // smooth over ~1s (10 x 100ms frames)
  const win = 10;
  const smoothed: { t: number; m: number }[] = [];
  for (let i = 0; i < series.length; i++) {
    const lo = Math.max(0, i - win / 2);
    const hi = Math.min(series.length, i + win / 2);
    let sum = 0;
    for (let j = lo; j < hi; j++) sum += series[j].m;
    smoothed.push({ t: series[i].t, m: sum / (hi - lo) });
  }

  const mean = smoothed.reduce((a, s) => a + s.m, 0) / smoothed.length;
  const sd = Math.sqrt(smoothed.reduce((a, s) => a + (s.m - mean) ** 2, 0) / smoothed.length) || 1;

  // local maxima with z >= 1.5, min 20s apart, best 15
  const peaks: EnergyPeak[] = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    const z = (smoothed[i].m - mean) / sd;
    if (z < 1.5) continue;
    if (smoothed[i].m < smoothed[i - 1].m || smoothed[i].m < smoothed[i + 1].m) continue;
    const last = peaks[peaks.length - 1];
    if (last && smoothed[i].t - last.t < 20) {
      if (z > last.z) peaks[peaks.length - 1] = { t: smoothed[i].t, z };
      continue;
    }
    peaks.push({ t: smoothed[i].t, z });
  }
  return peaks.sort((a, b) => b.z - a.z).slice(0, 15).sort((a, b) => a.t - b.t);
}
