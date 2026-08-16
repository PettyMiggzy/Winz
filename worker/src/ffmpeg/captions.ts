/**
 * Generate TikTok-style karaoke captions (ASS) from Whisper word timestamps.
 * Pure — returns the .ass file contents as a string. Grounded in
 * docs/research/06-video-pipeline.md (PlayResX/Y must be set or sizes break;
 * per-word highlight needs ASS \k tags, not force_style).
 */

export interface Word {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export interface CaptionOptions {
  maxWordsPerLine?: number;
  maxLineDurationSec?: number;
  uppercase?: boolean;
  fontName?: string;
  fontSize?: number;
  /** &HAABBGGRR — the "sung"/highlight colour. Default brand green. */
  primaryColour?: string;
  marginV?: number;
}

const DEFAULTS: Required<CaptionOptions> = {
  maxWordsPerLine: 4,
  maxLineDurationSec: 2.5,
  uppercase: true,
  fontName: "Arial",
  fontSize: 64,
  primaryColour: "&H0019E57F", // brand green (BBGGRR = 7F E5 19)
  marginV: 300,
};

/** Seconds -> ASS timestamp H:MM:SS.CC (centiseconds). */
export function assTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  const cc = cs === 100 ? 99 : cs; // guard rounding to 100
  return `${h}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cc).padStart(2, "0")}`;
}

/** Group words into short caption lines by word count and duration. */
export function groupWords(words: Word[], maxWords: number, maxDur: number): Word[][] {
  const lines: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    if (cur.length === 0) {
      cur.push(w);
      continue;
    }
    const lineStart = cur[0].start;
    const wouldExceed = cur.length >= maxWords || w.end - lineStart > maxDur;
    if (wouldExceed) {
      lines.push(cur);
      cur = [w];
    } else {
      cur.push(w);
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function escapeAss(text: string): string {
  // Braces open ASS override blocks; newlines must be literal \N.
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\r?\n/g, " ");
}

export function buildAss(words: Word[], options: CaptionOptions = {}): string {
  const o = { ...DEFAULTS, ...options };
  const header =
    `[Script Info]\n` +
    `ScriptType: v4.00+\n` +
    `PlayResX: 1080\n` +
    `PlayResY: 1920\n` +
    `WrapStyle: 2\n` +
    `ScaledBorderAndShadow: yes\n\n` +
    `[V4+ Styles]\n` +
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Winz,${o.fontName},${o.fontSize},${o.primaryColour},&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,4,2,2,60,60,${o.marginV},1\n\n` +
    `[Events]\n` +
    `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  const clean = words
    .filter((w) => w.text && w.text.trim().length > 0)
    .map((w) => ({ ...w, end: Math.max(w.end, w.start) }));

  const lines = groupWords(clean, o.maxWordsPerLine, o.maxLineDurationSec);

  const events = lines
    .map((line) => {
      const start = assTime(line[0].start);
      const end = assTime(line[line.length - 1].end);
      const text = line
        .map((w) => {
          const durCs = Math.max(1, Math.round((w.end - w.start) * 100));
          const t = o.uppercase ? w.text.toUpperCase() : w.text;
          return `{\\k${durCs}}${escapeAss(t.trim())} `;
        })
        .join("")
        .trimEnd();
      return `Dialogue: 0,${start},${end},Winz,,0,0,0,,${text}`;
    })
    .join("\n");

  return header + events + (events ? "\n" : "");
}
