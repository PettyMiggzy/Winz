/**
 * Per-platform output specs and FFmpeg encode args. Pure — returns argument
 * arrays, spawns nothing. Grounded in docs/research/06-video-pipeline.md.
 *
 * All three platforms want the same safe upload target in 2026: 1080x1920 9:16,
 * H.264 High + AAC, yuv420p, faststart. H.265 gains nothing (they re-encode).
 */

export type Platform = "tiktok" | "youtube" | "instagram";

export interface PlatformSpec {
  width: number;
  height: number;
  fps: 30 | 60;
  /** Hard cap we enforce on clip length (seconds). */
  maxDurationSec: number;
  vBitrateK: number; // target video kbps
  aBitrateK: number; // audio kbps
}

/**
 * Keep everything <= 60s: YouTube Shorts between 61s-3min with any Content ID
 * music claim are blocked outright, and Reels > 3min lose recommendation.
 */
export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  tiktok: { width: 1080, height: 1920, fps: 30, maxDurationSec: 60, vBitrateK: 8000, aBitrateK: 192 },
  youtube: { width: 1080, height: 1920, fps: 60, maxDurationSec: 60, vBitrateK: 12000, aBitrateK: 384 },
  instagram: { width: 1080, height: 1920, fps: 30, maxDurationSec: 60, vBitrateK: 8000, aBitrateK: 192 },
};

export function clampDuration(sec: number, platform: Platform): number {
  const max = PLATFORM_SPECS[platform].maxDurationSec;
  return Math.max(1, Math.min(sec, max));
}

/**
 * Final-stage encode args (after the filtergraph has produced 1080x1920).
 * Placed after -vf/-filter_complex and before the output path.
 */
export function buildEncodeArgs(platform: Platform): string[] {
  const s = PLATFORM_SPECS[platform];
  return [
    "-c:v", "libx264",
    "-profile:v", "high",
    "-preset", "veryfast",
    "-crf", "20",
    "-maxrate", `${s.vBitrateK}k`,
    "-bufsize", `${s.vBitrateK * 2}k`,
    "-pix_fmt", "yuv420p",
    "-r", String(s.fps),
    "-c:a", "aac",
    "-b:a", `${s.aBitrateK}k`,
    "-ar", "48000",
    "-movflags", "+faststart",
  ];
}

/** Even dimensions are mandatory for libx264 (odd values fail the encode). */
export function assertEven(w: number, h: number): void {
  if (w % 2 !== 0 || h % 2 !== 0) {
    throw new Error(`libx264 requires even dimensions, got ${w}x${h}`);
  }
}
