import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResolvedClip, Word, Facecam } from './types.ts';
import { buildAss } from './captions.ts';
import { run } from './ffmpeg.ts';

/** 9:16 1080x1920, H.264 + AAC, +faststart (moov at front — required for
 *  Instagram's API and the #1 silent upload failure if you forget it). */
export async function renderClip(
  input: string,
  clip: ResolvedClip,
  allWords: Word[],
  outDir: string,
  layout: 'crop' | 'blurpad' | 'split' = 'crop',
  burnHook = true,
  facecam?: Facecam,
): Promise<string> {
  const dur = clip.end - clip.start;
  const outFile = join(outDir, `${clip.slug}.mp4`);
  const assFile = join(outDir, `${clip.slug}.ass`);

  const clipWords = allWords
    .filter((w) => w.start >= clip.start - 0.05 && w.end <= clip.end + 0.25)
    .map((w) => ({ ...w, start: Math.max(0, w.start - clip.start), end: Math.max(0, w.end - clip.start) }));

  await writeFile(assFile, buildAss(clipWords, dur, burnHook ? clip.title : undefined), 'utf8');

  const geometry = buildGeometry(layout, facecam);

  // input seeking (-ss before -i) + re-encode = frame-accurate cut
  await run('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', clip.start.toFixed(3),
    '-i', input,
    '-t', dur.toFixed(3),
    '-vf', `${geometry},ass=${assFile.replace(/([:\\'])/g, '\\$1')}`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
    '-movflags', '+faststart',
    outFile,
  ]);
  return outFile;
}

/**
 * The vertical framing. Three shapes:
 *  - crop:    centre-cut to 9:16 (talking head / IRL)
 *  - blurpad: whole frame letterboxed over a blurred fill (nothing lost)
 *  - split:   facecam stacked on top of gameplay — the layout gaming clips
 *             need, because a centre crop throws the streamer's face away.
 *
 * `split` needs to know where the facecam sits, and guessing wrong produces a
 * clip framed on the wrong thing. When it isn't configured we fall back to a
 * centre crop rather than shipping a broken frame.
 */
export function buildGeometry(layout: 'crop' | 'blurpad' | 'split', facecam?: Facecam): string {
  if (layout === 'blurpad') {
    return `split[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24[bgb];[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2`;
  }
  if (layout === 'split' && facecam) {
    const { x, y, w, h } = facecam;
    // Top 40% = facecam, bottom 60% = gameplay (1080x768 over 1080x1152).
    // Each half is filled then centre-cropped so neither is stretched.
    const cam =
      `crop=iw*${w.toFixed(4)}:ih*${h.toFixed(4)}:iw*${x.toFixed(4)}:ih*${y.toFixed(4)},` +
      `scale=1080:768:force_original_aspect_ratio=increase,crop=1080:768,setsar=1`;
    // 1080/1152 = 0.9375 — the gameplay half's aspect ratio.
    const game = `crop='min(iw,ih*0.9375)':ih,scale=1080:1152,setsar=1`;
    return `split=2[cam][game];[cam]${cam}[camv];[game]${game}[gamev];[camv][gamev]vstack=inputs=2`;
  }
  return `crop='min(iw,ih*9/16)':ih,scale=1080:1920`;
}
