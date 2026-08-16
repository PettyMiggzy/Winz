import type { Word } from './types.ts';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Find a quoted phrase in the word-timestamp list. Sliding token window with
 *  tolerance for small transcription/quoting drift. Returns word index range. */
export function findQuote(
  words: Word[],
  quote: string,
  searchFrom = 0,
): { startIdx: number; endIdx: number; confidence: number } | null {
  const q = quote.split(/\s+/).map(norm).filter(Boolean);
  if (q.length === 0) return null;

  const w = words.map((x) => norm(x.text));
  let best: { startIdx: number; endIdx: number; confidence: number } | null = null;

  for (let i = searchFrom; i <= w.length - q.length; i++) {
    let hits = 0;
    for (let j = 0; j < q.length; j++) {
      if (w[i + j] === q[j]) hits++;
      else if (w[i + j] && q[j] && (w[i + j].startsWith(q[j]) || q[j].startsWith(w[i + j]))) hits += 0.5;
    }
    const conf = hits / q.length;
    if (!best || conf > best.confidence) {
      best = { startIdx: i, endIdx: i + q.length - 1, confidence: conf };
      if (conf === 1) break;
    }
  }
  return best && best.confidence >= 0.7 ? best : null;
}
