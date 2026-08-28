import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Transcript, Word, Segment } from './types.ts';
import { extractAudio, probeDuration } from './ffmpeg.ts';
import { HttpError, retryAfterMs, withRetry } from './http.ts';

const GROQ_BASE = process.env.STT_BASE_URL ?? 'https://api.groq.com/openai/v1';
const STT_MODEL = process.env.STT_MODEL ?? 'whisper-large-v3-turbo';
const CHUNK_SEC = 1200; // 20 min per chunk keeps files well under API size limits

interface VerboseJson {
  duration?: number;
  segments?: { start: number; end: number; text: string }[];
  words?: { word: string; start: number; end: number }[];
}

async function transcribeFile(audioPath: string): Promise<VerboseJson> {
  const key = process.env.GROQ_API_KEY ?? process.env.STT_API_KEY;
  if (!key) throw new Error('Set GROQ_API_KEY (or STT_API_KEY + STT_BASE_URL) for transcription');

  const buf = await readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'audio.mp3');
  form.append('model', STT_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  // Pinning the language stops Whisper drifting into another one on slang-heavy
  // or music-heavy audio; the prompt biases spelling of names it can't know.
  form.append('language', process.env.STT_LANGUAGE ?? 'en');
  if (process.env.STT_VOCAB) form.append('prompt', process.env.STT_VOCAB);

  // Transcription sits downstream of a download that can cost tens of GB, so a
  // rate limit here must not discard the whole job — retry rather than throw.
  return withRetry(async () => {
    const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const err = new HttpError(res.status, await res.text()) as HttpError & { retryAfterMs?: number };
      const after = retryAfterMs(res);
      if (after !== null) err.retryAfterMs = after;
      throw err;
    }
    return (await res.json()) as VerboseJson;
  }, { label: 'stt', attempts: 4 });
}

/** Transcribe a video/audio file with word-level timestamps. Chunks long inputs
 *  and re-offsets timestamps so callers always see one continuous timeline. */
export async function transcribe(inputPath: string, tmpDir: string): Promise<Transcript> {
  const duration = await probeDuration(inputPath);
  const words: Word[] = [];
  const segments: Segment[] = [];

  const chunks = Math.max(1, Math.ceil(duration / CHUNK_SEC));
  for (let i = 0; i < chunks; i++) {
    const offset = i * CHUNK_SEC;
    const audioPath = join(tmpDir, `stt_${i}.mp3`);
    await extractAudio(inputPath, audioPath, offset, Math.min(CHUNK_SEC, duration - offset));
    const size = (await stat(audioPath)).size;
    if (size < 1024) continue; // silent/empty tail
    const vj = await transcribeFile(audioPath);
    for (const w of vj.words ?? []) {
      words.push({ text: w.word.trim(), start: w.start + offset, end: w.end + offset });
    }
    for (const s of vj.segments ?? []) {
      segments.push({ start: s.start + offset, end: s.end + offset, text: s.text.trim() });
    }
  }
  return { words, segments, duration };
}
