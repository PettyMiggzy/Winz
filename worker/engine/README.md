# clip-engine

Upload a VOD → get back ranked, titled, captioned, ready-to-post 9:16 clips.

Zero runtime dependencies (Node ≥ 22.6 + ffmpeg). One API key. ~$0.03–0.06 per 30-minute video.

```
video upload
   │
   ├─ ffmpeg: extract 16kHz mono audio ──► Whisper (Groq) ──► word-level timestamps
   ├─ ffmpeg: ebur128 loudness ──► z-scored energy peaks (shouting/laughing/hype)
   │
   ▼
LLM scorer  ← transcript + energy peaks + style hint
   │  returns moments as VERBATIM QUOTES + title/caption/hashtags/score
   ▼
quote → timestamp matcher   (frame-accurate cuts, hallucination-proof)
   │  snap to word boundaries, enforce 10–32s, dedupe overlaps
   ▼
ffmpeg render: 9:16 1080x1920, word-by-word highlighted captions,
hook title top-safe-zone, +faststart
   │
   ▼
clips-out/*.mp4 + manifest.json
```

## The one design decision that matters

**The LLM never emits timestamps.** LLMs hallucinate timestamps constantly — "great moment at 12:34" lands 20 seconds off and your clip opens mid-sentence. Instead the scorer returns the **exact first and last words** of each moment, and `match.ts` finds those quotes in the Whisper word timeline. Timestamps come from Whisper's alignment, which is frame-accurate. If a quote can't be found (hallucinated moment), the clip is dropped and logged in `manifest.dropped` instead of shipping a broken cut. Fuzzy matching tolerates small transcription drift (tested at 0.89 confidence on typo'd quotes).

## Setup

```bash
# needs: node >= 22.6, ffmpeg on PATH
export GROQ_API_KEY=gsk_...   # one key does both transcription + scoring

node --experimental-strip-types src/cli.ts my-vod.mp4 ./clips-out
# node >= 23: the flag is on by default. Or: npx tsx src/cli.ts my-vod.mp4
```

Optional env:

| Var | Default | Notes |
|---|---|---|
| `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` | Groq / `llama-3.3-70b-versatile` | Any OpenAI-compatible endpoint. Gemini: base `https://generativelanguage.googleapis.com/v1beta/openai`, model `gemini-2.5-flash`. Better titles: point at GPT-4o / Claude via a compat proxy |
| `STT_BASE_URL` / `STT_MODEL` / `STT_API_KEY` | Groq / `whisper-large-v3-turbo` | Any OpenAI-compatible `/audio/transcriptions` |
| `STYLE_HINT` | — | e.g. `"Kick streamer, slots + IRL reactions, chaotic energy"` — steers the scorer hard, set it |
| `LAYOUT` | `crop` | `crop` for facecam/IRL, `blurpad` for gameplay where you need the whole frame |

As a library:

```ts
import { processVideo } from './src/index.ts';

const manifest = await processVideo('/tmp/upload.mp4', '/tmp/out', {
  styleHint: user.channelDescription,
  layout: 'crop',
  clipCount: 6,
  onProgress: (stage, detail) => job.log(`${stage}: ${detail}`),
});
// manifest.clips: [{ file, title, caption, hashtags, score, category, start, end, reason }]
```

## Wiring into WinClipz (Next.js on Vercel)

Vercel functions can't run this — 4.5 MB body limit, no long-running ffmpeg. The standard shape:

1. **Upload:** API route issues a presigned PUT URL for R2/S3 → browser uploads the video directly to storage. Never proxy video bytes through Vercel.
2. **Queue:** route enqueues `{videoKey, userId, options}` — Upstash QStash, Inngest, or Trigger.dev all work fine from Vercel.
3. **Worker:** a $5/mo Railway/Fly container (Node 22 + ffmpeg installed) pulls the job, downloads from R2, runs `processVideo()`, uploads `clips-out/` back to R2, marks the job done.
4. **App:** lists clips from the manifest — show `title`, `score`, `reason`, and a "regenerate title" button that re-prompts with just that clip's transcript slice (cheap).

Render time on a 2-vCPU container is roughly 0.3–0.5× realtime for the transcription+analysis pass and a few seconds per clip to encode.

## Cost per 30-min upload (defaults)

| Step | Cost |
|---|---|
| Groq Whisper turbo (~$0.04/hr audio) | ~$0.02 |
| LLM scoring (one call, ~8k tokens in) | < $0.01 |
| ffmpeg | compute only |
| **Total** | **~$0.03–0.06** |

Compare: OpusClip prices per *source* minute — 30 min = 30 credits ≈ $2.90 at Pro rates, ~50–100× this pipeline, with no control over the scorer.

## Behavior notes

- **Speech-light VODs** (pure gameplay, music): if under ~40 words, falls back to cutting windows around the loudest energy peaks and flags `needsManualTitle: true` — titles can't be inferred from speech that doesn't exist. The UI should surface these for a manual title.
- **Hook title** burns into the top safe zone for the first 3.5s, then disappears. Captions sit in the lower third, above platform UI chrome. Both are ASS subtitles — restyle in `captions.ts` (font, colors, sizes are the first constants). For a custom font, drop a TTF in `./fonts` and add `:fontsdir=./fonts` to the `ass=` filter in `render.ts`.
- **Scores are honest** — the prompt demands spread, not everything at 90. Sort by score, post the top 3, keep the rest as backfill.
- **`manifest.dropped`** tells you *why* picks were rejected (quote not found / overlap / collapsed window). Watch it — a high drop rate means the transcript quality is bad (music-heavy audio) or the LLM model is too weak.

## Upgrade paths, in order of value

1. **Chat-replay signal (your moat).** For Kick VODs, fetch the chat replay, compute messages/sec, z-score it exactly like `audioEnergy.ts`, and pass the spikes into the scorer prompt alongside audio peaks. Chat velocity is the single best predictor of a clippable stream moment and no off-the-shelf tool uses it. The prompt already has the slot — just append to the peaks line.
2. **Per-platform title variants.** One extra LLM call per kept clip: TikTok (lowercase, chaotic), Shorts (Title Case, searchable), Reels (caption-forward). Pennies.
3. **Active-speaker crop for IRL.** `crop` assumes a centered subject. For multi-person IRL, Sieve's autocrop ($2.55/hr) — run it only on kept clip windows, not the whole VOD (~20× cheaper).
4. **Thumbnail frame pick.** `ffmpeg -ss <peak> -vframes 1` at the highest-energy moment inside each clip; Shorts can't take custom thumbnails but TikTok covers matter.

## Tests

```bash
node --experimental-strip-types test/synthetic.test.ts
```

Offline, no API keys — builds a synthetic video with known loud bursts, fabricates a transcript, and asserts: energy parser finds the bursts, exact + fuzzy quote matching works, hallucinated quotes get dropped, overlaps dedupe, output is 1080×1920 h264 at the right duration with moov up front. 14 checks, all passing on Node 22.22 / ffmpeg 6.1.
