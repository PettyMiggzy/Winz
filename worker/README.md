# Winz — Worker (the clip engine)

The heavy pipeline that turns a stream into branded vertical clips. **Runs on
your own server / a VPS, not Vercel** — it needs FFmpeg, real CPU/RAM, and
long-running jobs (see `../ARCHITECTURE.md`, `../docs/STRATEGY.md`).

```
source ─▶ audio + RMS ─▶ transcribe ─▶ detect (audio + chat + transcript)
       ─▶ fuse candidates ─▶ [per top moment] LLM score ─▶ music gate
       ─▶ render 9:16 + karaoke captions + watermark ─▶ publish
```

## What's built vs. wired

**Built and unit-tested (the hard, differentiated logic — `npm test`, 48 checks):**
- `src/ffmpeg/encode.ts` — per-platform encode specs + args (1080×1920 H.264 High, ≤60s).
- `src/ffmpeg/layouts.ts` — 9:16 filtergraphs (center-crop / blur-pad / facecam-stack) + centered watermark.
- `src/ffmpeg/captions.ts` — TikTok-style ASS karaoke captions from Whisper word timestamps.
- `src/ffmpeg/render.ts` — assembles the full FFmpeg argv (`buildRenderArgs`).
- `src/detect/audio.ts` — per-stream z-score peak detection.
- `src/detect/chat.ts` — chat-velocity spikes, shifted back for chat lag.
- `src/detect/fusion.ts` — merge/score signals into ranked candidate windows.

**Interfaces to wire on the host (clearly stubbed, throw with a TODO):**
- `transcribe.ts` — faster-whisper sidecar (`py/`) or Groq.
- `detect/score.ts` — Claude Haiku for virality score + title/hook (prompt included).
- `music.ts` — YAMNet + AudD gate, Demucs strip.
- `publish/` — Instagram official + Blotato bridge → official TikTok/YouTube.
- `pipeline.ts` external stages — `ffprobe` duration, audio extraction, RMS series, ass write, DB persist.

## Requirements

- **Node 24**, **Redis** (BullMQ), **FFmpeg 7+** built with `libass` + `drawtext`
  (verify: `ffmpeg -filters | grep -E 'ass|drawtext'`), and fonts + fontconfig.
- For local transcription: Python + `faster-whisper` (or set `WHISPER_MODE=groq`).

## Run

```bash
npm install
npm test                 # pure-logic tests (no ffmpeg needed)
cp .env.example .env      # REDIS_URL, ANTHROPIC_API_KEY, GROQ/AUDD keys, FFMPEG_PATH...
npm run dev               # consume jobs from Redis
```

The web app enqueues a `winz:process-stream` job when a Kick stream ends
(`/api/webhooks/kick`). This worker consumes it and produces clips.
