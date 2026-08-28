import type { Transcript, EnergyPeak, MomentPick } from './types.ts';
import { HttpError, isRetryable, retryAfterMs, withRetry } from './http.ts';

export interface ScoreSignals {
  audioPeaks: EnergyPeak[];
  chatSpikes?: EnergyPeak[];
}

const LLM_BASE = process.env.LLM_BASE_URL ?? 'https://api.groq.com/openai/v1';
const LLM_MODEL = process.env.LLM_MODEL ?? 'llama-3.3-70b-versatile';
const CATEGORIES = ['funny', 'hype', 'rage', 'wtf', 'clutch', 'drama', 'wholesome', 'other'];

const fmtTs = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const SYSTEM_PROMPT = `You are an elite short-form clip editor for livestream content (Kick/Twitch style: gaming, IRL, reactions, gambling moments, drama). You receive a timestamped transcript of a stream VOD plus a list of audio-energy spikes (moments where the streamer got loud: shouting, laughing, hype).

Your job: pick the moments most likely to go viral as 10-30 second vertical clips, and write the hook/title for each.

WHAT MAKES A STREAM CLIP WORK (in priority order):
1. Emotional spike with a visible payoff INSIDE the window — rage, disbelief, huge laugh, big win, brutal fail.
2. Zero context needed. A viewer who has never seen this streamer must understand it in the first 2 seconds.
3. A quotable line. If the streamer says something absurd/iconic, the clip opens on or just before it.
4. Stakes stated fast. "If this hits I win $X" style setups only if the payoff is within the same window.
5. Audio-energy spikes AND chat-velocity spikes are strong evidence — most picks should sit near one of them. When chat suddenly floods (messages/sec surges), something clip-worthy just happened even if the words look flat; weight those moments up. A quiet deadpan moment can still work if the line is good.

AVOID: inside jokes, slow setups, mid-conversation meanders, sponsor reads, greetings/outros, moments whose payoff is off-screen or outside the window, near-duplicate moments (pick the single best of a cluster).

BOUNDARY RULES — CRITICAL:
- You give boundaries as VERBATIM QUOTES from the transcript, never as timestamps.
- "start_quote": the exact first 5-10 words spoken in the clip. The clip must open ON action or the hook line — max 1.5s of setup before the payoff begins.
- "end_quote": the exact last 5-10 words. End on the punchline/reaction, never mid-sentence, never trailing into the next topic.
- Copy quotes character-for-character from the transcript. Do not paraphrase, fix grammar, or add punctuation that isn't there.

TITLES ("title" = the hook burned onto the video, <= 8 words):
- Outcome-first or curiosity gap. Present tense. No lying, no "wait for it", no emoji, no hashtags, no quotes around it.
- Good: "He bet the whole balance on red" / "The scream broke his mic" / "Chat predicted this 10 seconds early"
- Bad: "Funny moment from stream" / "You won't BELIEVE what happened"

CAPTION: one casual line, written like a fan account would, no hashtags in it.
HASHTAGS: 3-5, niche-specific (game name, streamer scene), never generic spam like #fyp #viral.

Return ONLY valid JSON: {"moments": [{"start_quote", "end_quote", "title", "caption", "hashtags", "category", "score", "reason"}]}
- category: one of ${CATEGORIES.join(', ')}
- score: 0-100 honest virality estimate (spread your scores; not everything is a 90)
- reason: one short line
- Order by score descending. If the transcript genuinely has fewer good moments than asked, return fewer — do not pad with weak picks.`;

const fmtPeaks = (peaks: EnergyPeak[]) =>
  peaks.length > 0
    ? peaks.map((p) => `${fmtTs(p.t)} (intensity ${p.z.toFixed(1)})`).join(', ')
    : 'none detected';

function buildUserPrompt(t: Transcript, signals: ScoreSignals, count: number, styleHint?: string): string {
  const lines = t.segments.map((s) => `[${fmtTs(s.start)}] ${s.text}`).join('\n');
  const chat = signals.chatSpikes ?? [];
  return [
    styleHint ? `Channel style: ${styleHint}` : null,
    `VOD duration: ${fmtTs(t.duration)}. Select up to ${count} moments.`,
    `Audio-energy spikes at: ${fmtPeaks(signals.audioPeaks)}`,
    chat.length > 0 ? `Chat-velocity spikes at: ${fmtPeaks(chat)}` : null,
    `TRANSCRIPT:\n${lines}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function validate(raw: unknown): MomentPick[] {
  const obj = raw as { moments?: unknown };
  if (!obj || !Array.isArray(obj.moments)) throw new Error('missing "moments" array');
  return obj.moments.map((m: any, i: number) => {
    for (const k of ['start_quote', 'end_quote', 'title', 'caption']) {
      if (typeof m[k] !== 'string' || m[k].trim() === '') throw new Error(`moment[${i}].${k} missing`);
    }
    return {
      start_quote: m.start_quote.trim(),
      end_quote: m.end_quote.trim(),
      title: m.title.trim(),
      caption: m.caption.trim(),
      hashtags: Array.isArray(m.hashtags)
        ? m.hashtags.map((h: string) => String(h).replace(/^#?/, '#')).slice(0, 5)
        : [],
      category: CATEGORIES.includes(m.category) ? m.category : 'other',
      score: Math.max(0, Math.min(100, Number(m.score) || 50)),
      reason: String(m.reason ?? '').trim(),
    } as MomentPick;
  });
}

async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY;
  if (!key) throw new Error('Set GROQ_API_KEY (or LLM_API_KEY + LLM_BASE_URL/LLM_MODEL)');
  const res = await fetch(`${LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = new HttpError(res.status, await res.text()) as HttpError & { retryAfterMs?: number };
    const after = retryAfterMs(res);
    if (after !== null) err.retryAfterMs = after;
    throw err;
  }
  const data = (await res.json()) as any;
  return data.choices[0].message.content as string;
}

/**
 * Ask the LLM for the best moments.
 *
 * Transport failures and schema failures need opposite handling, and treating
 * them alike was actively harmful: a 400 for an over-long prompt used to be
 * "retried" by appending two more turns to the same message array — strictly
 * larger, and guaranteed to fail again. So a rate limit retries the SAME
 * messages with backoff, a bad-request fails immediately, and only a genuine
 * schema violation grows the conversation with a correction.
 */
export async function scoreMoments(
  t: Transcript,
  signals: ScoreSignals,
  count: number,
  styleHint?: string,
): Promise<MomentPick[]> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(t, signals, count, styleHint) },
  ];
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // withRetry handles 429/5xx on the unchanged prompt; anything else throws
      // straight out to the schema-correction path or to the caller.
      const content = await withRetry(() => chat(messages), { label: 'llm-score', attempts: 4 });
      return validate(JSON.parse(content));
    } catch (e) {
      lastErr = e as Error;
      if (e instanceof HttpError) {
        // A 4xx that survived the retries is a malformed request — most often
        // the prompt exceeding the context window. Growing it cannot help.
        throw new Error(
          e.status === 413 || e.status === 400
            ? `scoring request rejected (${e.status}) — the transcript is likely too long for ${LLM_MODEL}: ${e.body.slice(0, 200)}`
            : e.message
        );
      }
      if (isRetryable(e) && !(e instanceof SyntaxError)) throw e;
      messages.push(
        { role: 'assistant', content: 'INVALID' },
        { role: 'user', content: `Your last response was invalid (${lastErr.message}). Return ONLY the JSON object in the required schema.` },
      );
    }
  }
  throw lastErr ?? new Error('scoring failed');
}

/** Fallback for speech-light VODs (pure gameplay): cut windows around the
 *  loudest peaks. Titles can't be inferred without speech — flagged manual. */
export function energyOnlyFallback(peaks: EnergyPeak[], count: number, clipLen: number): MomentPick[] {
  return peaks.slice(0, count).map((p, i) => ({
    start_quote: '',
    end_quote: '',
    title: '',
    caption: '',
    hashtags: [],
    category: 'hype' as const,
    score: Math.round(60 + Math.min(30, p.z * 10)),
    reason: `audio spike z=${p.z.toFixed(1)} at ${fmtTs(p.t)} (no transcript — energy-only pick #${i + 1})`,
  }));
}
