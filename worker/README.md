# Winz — Worker (the clip engine)

Turns a recorded stream or an uploaded video into ranked, titled, captioned
9:16 clips. **Runs on your own server / a VPS, not Vercel** — it needs FFmpeg,
real CPU/RAM, and long-running jobs.

```
source ─▶ transcribe (Whisper word timestamps)
       ─▶ signals: audio-energy peaks + chat-velocity spikes
       ─▶ LLM scoring (returns verbatim quote boundaries, never timestamps)
       ─▶ align quotes to the word timeline → frame-accurate cuts
       ─▶ render 9:16 + word-by-word captions ─▶ manifest.json ─▶ publish
```

## Layout

- **`engine/`** — the clip engine (standalone, zero runtime deps, runs on
  `node --experimental-strip-types` or `tsx`). This is the differentiated core:
  - `transcribe.ts` — Whisper via Groq (word timestamps)
  - `audioEnergy.ts` — ebur128 loudness peaks (shouting/laughter/hype)
  - `chat.ts` — **chat-velocity spikes** (the signal no off-the-shelf clipper
    uses; messages/sec z-scored, shifted back for chat lag)
  - `score.ts` — LLM picks moments + writes hook/title/caption/hashtags, keyed
    off the transcript + audio peaks + chat spikes
  - `match.ts` / `index.ts` — align the LLM's verbatim quotes to the word
    timeline; a hallucinated quote is dropped, never shipped
  - `render.ts` / `captions.ts` / `ffmpeg.ts` — 9:16 render, CapCut-style
    captions, `+faststart`
- **`src/`** — the runner: BullMQ queue (`queue.ts`), job handler
  (`pipeline.ts` → calls `engine.processVideo`), music gate (`music.ts`),
  publish adapters (`publish/`), entrypoint (`index.ts`).

## Requirements

- **Node 22.6+**, **Redis** (BullMQ), **FFmpeg 7+** with `libass` + `ebur128`
  (`ffmpeg -filters | grep -E 'ass|ebur128'`), fonts + fontconfig.

## Run

```bash
npm install
npm test                  # chat-velocity + quote-alignment (no ffmpeg needed)
cp .env.example .env       # GROQ_API_KEY (or LLM_*), REDIS_URL, FFMPEG_PATH...
npm run dev                # consume jobs from Redis

# one-off, directly:
node --experimental-strip-types engine/cli.ts input.mp4 ./out --style "Kick gaming/IRL"
```

`processVideo(input, outDir, opts)` writes each clip plus a `manifest.json` the
Winz dashboard renders directly. ~$0.03–0.06 per 30-min upload vs ~$2.90 through
OpusClip.

## Notes

- **LLM**: defaults to Groq `llama-3.3-70b` (OpenAI-compatible, cheap). Point at
  any OpenAI-compatible endpoint via `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`.
  (Claude Haiku needs a small adapter since Anthropic isn't OpenAI-compatible.)
- **No burned-in center watermark** — a persistent superimposed logo can make a
  TikTok ineligible for the For You feed. The CTA lives in the username, bio, a
  spoken line, and the hook title; add a short corner end-card if desired.
- The engine's own render/energy tests need an ffmpeg host; `npm test` here
  covers the pure logic (chat velocity, quote alignment, hallucination drop).
