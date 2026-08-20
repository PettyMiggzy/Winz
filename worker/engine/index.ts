import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EngineOptions, Manifest, MomentPick, ResolvedClip, Transcript, ClipResult } from './types.ts';
import { probeDuration } from './ffmpeg.ts';
import { transcribe } from './transcribe.ts';
import { detectEnergyPeaks } from './audioEnergy.ts';
import { detectChatSpikes } from './chat.ts';
import { scoreMoments, energyOnlyFallback } from './score.ts';
import { findQuote } from './match.ts';
import { renderClip } from './render.ts';

export * from './types.ts';
export { transcribe } from './transcribe.ts';
export { detectEnergyPeaks } from './audioEnergy.ts';
export { detectChatSpikes } from './chat.ts';
export { scoreMoments } from './score.ts';
export { findQuote } from './match.ts';
export { renderClip } from './render.ts';

const slugify = (s: string, i: number) =>
  (s || `clip-${i + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `clip-${i + 1}`;

/** Turn LLM quote-boundaries into exact timestamps via the word timeline. */
export function resolveMoments(
  picks: MomentPick[],
  t: Transcript,
  minSec: number,
  maxSec: number,
  peaks: { t: number; z: number }[],
): { resolved: ResolvedClip[]; dropped: { title: string; reason: string }[] } {
  const resolved: ResolvedClip[] = [];
  const dropped: { title: string; reason: string }[] = [];

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];

    // energy-only fallback picks have no quotes: window around the i-th peak
    if (p.start_quote === '' && peaks[i]) {
      const start = Math.max(0, peaks[i].t - maxSec * 0.35);
      resolved.push({
        ...p,
        start,
        end: Math.min(t.duration, start + Math.min(maxSec, Math.max(minSec, 20))),
        slug: slugify(p.title, i),
        matchConfidence: 0,
        needsManualTitle: true,
      });
      continue;
    }

    const s = findQuote(t.words, p.start_quote);
    if (!s) {
      dropped.push({ title: p.title, reason: `start_quote not found: "${p.start_quote.slice(0, 60)}"` });
      continue;
    }
    const e = findQuote(t.words, p.end_quote, s.endIdx);
    if (!e) {
      dropped.push({ title: p.title, reason: `end_quote not found after start: "${p.end_quote.slice(0, 60)}"` });
      continue;
    }

    let start = Math.max(0, t.words[s.startIdx].start - 0.25);
    let end = Math.min(t.duration, t.words[e.endIdx].end + 0.35);

    if (end - start < minSec) {
      // extend forward to the end of the containing/next segment
      const seg = t.segments.find((g) => g.end >= start + minSec);
      end = Math.min(t.duration, Math.max(seg ? seg.end + 0.2 : start + minSec, start + minSec));
    }
    if (end - start > maxSec) {
      // trim tail to the last word boundary inside the cap
      const cap = start + maxSec;
      const lastInside = [...t.words].reverse().find((w) => w.end <= cap && w.start >= start);
      end = lastInside ? lastInside.end + 0.2 : cap;
    }
    if (end - start < Math.min(6, minSec)) {
      dropped.push({ title: p.title, reason: 'window collapsed under minimum after snapping' });
      continue;
    }

    resolved.push({
      ...p,
      start,
      end,
      slug: slugify(p.title, i),
      matchConfidence: Math.min(s.confidence, e.confidence),
    });
  }

  // drop overlaps (>50% of the shorter clip), keep higher score
  resolved.sort((a, b) => b.score - a.score);
  const kept: ResolvedClip[] = [];
  for (const c of resolved) {
    const clash = kept.find((k) => {
      const ov = Math.min(c.end, k.end) - Math.max(c.start, k.start);
      return ov > 0.5 * Math.min(c.end - c.start, k.end - k.start);
    });
    if (clash) dropped.push({ title: c.title, reason: `overlaps higher-scored "${clash.title}"` });
    else kept.push(c);
  }
  return { resolved: kept, dropped };
}

export async function processVideo(inputPath: string, outDir: string, opts: EngineOptions = {}): Promise<Manifest> {
  const {
    minClipSec = 10,
    maxClipSec = 32,
    layout = 'crop',
    facecam,
    burnHookTitle = true,
    styleHint,
    onProgress = () => {},
  } = opts;

  await mkdir(outDir, { recursive: true });
  const tmp = await mkdtemp(join(tmpdir(), 'clipengine-'));

  try {
    const duration = await probeDuration(inputPath);
    const clipCount = opts.clipCount ?? Math.min(8, Math.max(3, Math.floor(duration / 60 / 4)));

    onProgress('transcribe', `${(duration / 60).toFixed(1)} min of source`);
    const [transcript, peaks] = await Promise.all([
      transcribe(inputPath, tmp),
      detectEnergyPeaks(inputPath),
    ]);
    // Chat velocity — the signal off-the-shelf clippers don't use. Cheap: it's
    // just message timestamps we captured live off Kick's Pusher socket.
    const chatSpikes = detectChatSpikes(opts.chatTimestamps ?? [], duration);
    // Combined anchors (audio + chat), strongest first — used for the
    // speech-light fallback so chat-driven moments still become clips.
    const anchors = [...peaks, ...chatSpikes].sort((a, b) => b.z - a.z);
    onProgress('signals', `${transcript.words.length} words, ${peaks.length} energy peaks, ${chatSpikes.length} chat spikes`);

    let picks: MomentPick[];
    if (transcript.words.length < 40) {
      onProgress('score', 'speech-light VOD — energy+chat fallback (titles need manual pass)');
      picks = energyOnlyFallback(anchors, clipCount, maxClipSec);
    } else {
      onProgress('score', `asking LLM for up to ${clipCount} moments`);
      picks = await scoreMoments(transcript, { audioPeaks: peaks, chatSpikes }, clipCount, styleHint);
    }

    const { resolved, dropped } = resolveMoments(picks, transcript, minClipSec, maxClipSec, anchors);
    onProgress('resolve', `${resolved.length} clips resolved, ${dropped.length} dropped`);

    const clips: ClipResult[] = [];
    for (const clip of resolved) {
      onProgress('render', `${clip.slug} [${clip.start.toFixed(1)}s → ${clip.end.toFixed(1)}s]`);
      const file = await renderClip(inputPath, clip, transcript.words, outDir, layout, burnHookTitle, facecam);
      clips.push({ ...clip, file });
    }

    const manifest: Manifest = {
      source: inputPath,
      durationSec: duration,
      createdAt: new Date().toISOString(),
      clips,
      dropped,
    };
    await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    onProgress('done', `${clips.length} clips → ${outDir}`);
    return manifest;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
