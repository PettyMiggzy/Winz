export interface Word {
  text: string;
  start: number; // seconds
  end: number;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  words: Word[];
  segments: Segment[];
  duration: number;
}

export interface EnergyPeak {
  t: number; // seconds
  z: number; // z-score of loudness
}

/** What the LLM returns per moment. Boundaries are QUOTES, not timestamps —
 *  LLMs hallucinate timestamps but quote text verbatim. We match quotes back
 *  to word-level timestamps for frame-accurate cuts. */
export interface MomentPick {
  start_quote: string; // first ~5-10 words spoken in the clip, verbatim
  end_quote: string;   // last ~5-10 words spoken in the clip, verbatim
  title: string;       // on-video hook, <= 8 words
  caption: string;     // post caption text (no hashtags)
  hashtags: string[];  // 3-5, niche-relevant
  category: 'funny' | 'hype' | 'rage' | 'wtf' | 'clutch' | 'drama' | 'wholesome' | 'other';
  score: number;       // 0-100 virality estimate
  reason: string;      // one line, why this moment
}

export interface ResolvedClip extends MomentPick {
  start: number;
  end: number;
  slug: string;
  matchConfidence: number;
  needsManualTitle?: boolean;
}

export interface ClipResult extends ResolvedClip {
  file: string;
}

export interface EngineOptions {
  /** target number of clips; default: duration-scaled 3-8 */
  clipCount?: number;
  minClipSec?: number; // default 10
  maxClipSec?: number; // default 32
  /** 'crop' = center-crop to 9:16 (facecam/IRL), 'blurpad' = fit whole frame on blurred bg (gameplay) */
  layout?: 'crop' | 'blurpad' | 'split';
  /** Where the facecam sits in the source frame, as 0-1 fractions. Required
   *  for the 'split' layout; without it split falls back to a centre crop. */
  facecam?: Facecam;
  /** shown at top of the video for the first ~3.5s; defaults to clip title */
  burnHookTitle?: boolean;
  /** e.g. "Kick streamer, gaming + IRL reactions" — steers the scorer */
  styleHint?: string;
  /** Live-captured Kick chat message times (seconds from stream start). When
   *  present, chat-velocity spikes are fed to the scorer alongside audio peaks. */
  chatTimestamps?: number[];
  onProgress?: (stage: string, detail?: string) => void;
}

export interface Manifest {
  source: string;
  durationSec: number;
  createdAt: string;
  clips: ClipResult[];
  dropped: { title: string; reason: string }[];
}

/** Facecam rectangle in the source frame, normalised to 0-1. */
export interface Facecam {
  x: number;
  y: number;
  w: number;
  h: number;
}
