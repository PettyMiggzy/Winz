import type { Word } from './types.ts';

/** CapCut-style word-by-word captions as an ASS subtitle file.
 *  Words are grouped <=3 per line; the active word is highlighted yellow.
 *  Optional hook title pinned to the top safe zone for the first ~3.5s.
 *  All times are relative to clip start (pass pre-shifted words). */

const HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Arial,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H7F000000,-1,0,0,0,100,100,0,0,1,10,0,2,60,60,600,1
Style: Hook,Arial,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H98000000,-1,0,0,0,100,100,0,0,3,8,0,8,80,80,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

const HIGHLIGHT = '&H0000E5FF&'; // warm yellow (ASS is BGR)

function ts(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${rest}`;
}

const sanitize = (t: string) => t.replace(/[{}\\]/g, '').replace(/\n/g, ' ').trim();

interface Group {
  words: Word[];
}

function groupWords(words: Word[], maxWords = 3, maxChars = 18): Group[] {
  const groups: Group[] = [];
  let cur: Word[] = [];
  let chars = 0;
  for (const w of words) {
    const t = sanitize(w.text);
    if (t === '') continue;
    const prev = cur[cur.length - 1];
    const gap = prev ? w.start - prev.end : 0;
    if (cur.length > 0 && (cur.length >= maxWords || chars + t.length > maxChars || gap > 0.8)) {
      groups.push({ words: cur });
      cur = [];
      chars = 0;
    }
    cur.push(w);
    chars += t.length + 1;
  }
  if (cur.length > 0) groups.push({ words: cur });
  return groups;
}

export function buildAss(words: Word[], clipDur: number, hookTitle?: string): string {
  let events = '';

  if (hookTitle && hookTitle.trim()) {
    const until = Math.min(3.5, clipDur);
    events += `Dialogue: 1,${ts(0)},${ts(until)},Hook,,0,0,0,,${sanitize(hookTitle).toUpperCase()}\n`;
  }

  for (const g of groupWords(words)) {
    const groupEnd = g.words[g.words.length - 1].end;
    for (let i = 0; i < g.words.length; i++) {
      const w = g.words[i];
      const lineEnd = i === g.words.length - 1 ? Math.min(groupEnd + 0.12, clipDur) : g.words[i + 1].start;
      if (lineEnd <= w.start) continue;
      const text = g.words
        .map((x, j) => {
          const t = sanitize(x.text);
          return j === i ? `{\\1c${HIGHLIGHT}}${t}{\\1c&H00FFFFFF&}` : t;
        })
        .join(' ');
      events += `Dialogue: 0,${ts(w.start)},${ts(lineEnd)},Cap,,0,0,0,,${text}\n`;
    }
  }

  return HEADER + events;
}
