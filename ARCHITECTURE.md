# Winz — Architecture

Automated Kick stream → highlight clips → multi-platform distribution. This
design is grounded in the Aug 2026 research sweeps in
[`docs/research/`](docs/research/) — every claim below is sourced there.

> **Product note:** Winz is now a **multi-tenant SaaS** (free at launch,
> subscription later), with **Winslow's channel as tenant #1 and the live
> proof**. This document describes the core pipeline, which is the same for one
> tenant or many. The multi-tenant deltas — user-initiated capture (Kick has no
> media API), the Meta/TikTok/YouTube audit gates, legal architecture, pricing,
> and the launch sequence — live in [`docs/STRATEGY.md`](docs/STRATEGY.md). The
> business case (why the clip flywheel works and what transfers from the
> Adin/N3on model) is in [`docs/BUSINESS-MODEL.md`](docs/BUSINESS-MODEL.md).
> Build every table with `tenant_id` from day one.

## Verdict

The system is absolutely buildable, and no commercial tool does the full loop
(Kick stream-end trigger → chat-aware highlight detection → branded vertical
clips → multi-account fan-out). But research forced **three changes to the
original plan**, all of which make it work *better*:

1. **Vercel hosts the dashboard only; a $10/mo VPS runs the video work.**
   Vercel is on Node 24 by default (Node 20 gets disabled Oct 1, 2026), but its
   4.5 MB request-body cap, ~500 MB `/tmp`, and stateless functions make it
   physically incapable of the download→transcribe→render loop. Split it.

2. **Capture the stream ourselves; don't scrape Kick VODs.**
   Kick's official API has **no VOD endpoints** — every VOD downloader relies on
   undocumented, Cloudflare-fenced routes that violate Kick's ToS and break
   regularly (they broke yt-dlp twice in 2026). Primary path: **record locally
   at broadcast time** (OBS simultaneous recording, or a capture daemon that
   records the live HLS while the stream is up). This is higher quality, has
   zero Kick-side risk, and sidesteps the 7-day VOD retention limit for
   unverified channels. yt-dlp (`yt-dlp[default,curl-cffi]`) stays as a
   documented fallback with its risk stated.

3. **2 differentiated accounts per platform, not 4 mirrors.**
   TikTok, Meta, and YouTube all fingerprint the *video content itself* across
   accounts in 2026. Four accounts posting the same clip = every copy
   suppressed, and unique captions don't help (matching runs on video+audio).
   Instagram now kills recommendations account-wide at ~10 reposts/30 days;
   YouTube's Feb 2027 rule requires **10M engaged Shorts views per 90 days per
   channel** for Shorts ad revenue — splitting views 4 ways murders
   monetization. The working 2026 pattern: **1 main + 1 clips account per
   platform (6 accounts total), each getting DIFFERENT clips, different
   hooks/captions, jittered posting times**, clearly branded as official.
   Same volume of posts, spread for reach instead of stacked into suppression.

## System overview

```
                         ┌──────────────────────────────────────────────┐
                         │  apps/web — Next.js on Vercel (Node 24)      │
                         │  • Kick webhook receiver (stream start/end)  │
                         │  • Dashboard: review queue, approve/edit     │
                         │  • OAuth flows + token vault (IG/YT/TikTok)  │
                         │  • Posting calendar & analytics              │
                         └───────────────┬──────────────────────────────┘
                                         │ enqueue jobs (Redis / BullMQ)
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  apps/worker — Docker on VPS (Hetzner CX33-class, 4 vCPU / 8 GB)       │
│                                                                        │
│  capture   → chat daemon (Pusher WS, live) + stream recorder (HLS)     │
│  transcribe→ faster-whisper (CPU int8) or Groq API ($0.02/30-min VOD)  │
│  detect    → audio RMS z-score + chat-velocity z-score + LLM rerank    │
│  music-gate→ YAMNet music classifier → AudD fingerprint → skip/strip   │
│  render    → ffmpeg: 9:16 layout, ASS karaoke captions, watermark      │
│  publish   → per-platform adapters (official APIs / Blotato)           │
│  measure   → pull views/engagement per post → feed back into detect    │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
              Cloudflare R2 (clips + public video_url for IG, zero egress)
              Postgres (VODs, moments, clips, accounts, posts, metrics)
```

## Pipeline stages

### 1. Trigger — official Kick webhook
- Register an app at `kick.com/settings/developer` (2FA required).
- Subscribe to `livestream.status.updated` via
  `POST https://api.kick.com/public/v1/events/subscriptions` (app token,
  `broadcaster_user_id` from `GET /public/v1/channels?slug=winslowbankz`).
- Event fires with `is_live=false` + `ended_at` when the stream ends → enqueue
  the processing job. Verify the RSA-SHA256 signature
  (`Kick-Event-Signature`, public key at `GET /public/v1/public-key`).
- **Ops trap:** Kick auto-unsubscribes webhooks after >1 day of failed
  deliveries — the worker health-checks the subscription hourly and
  re-subscribes if dropped.

### 2. Capture — own the source
- **Chat daemon** (runs while live): Pusher WS
  `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679`, channel
  `chatrooms.{chatroom_id}.v2`, event `App\Events\ChatMessageEvent`. Store
  `(timestamp, user, message)` rows. There is **no reliable chat replay** —
  if we don't capture live, the chat-velocity signal is gone.
- **Video**: primary = local OBS recording (streamer already encodes the
  broadcast; recording it costs nothing and is 1080p source quality) synced to
  the worker via watch-folder upload; alternative = worker records the live
  HLS while broadcasting. Fallback = `yt-dlp` VOD download post-stream
  (unofficial endpoints — ToS-gray, breaks periodically, sub-only VODs need
  cookies; see research doc 11).

### 3. Detect — three signals fused, then LLM-ranked
- **Audio**: RMS energy on 1 s windows (librosa or ffmpeg `astats`), per-stream
  z-score, rolling-percentile peaks. Relative baselines, never absolute dB.
- **Chat velocity**: messages-per-second z-score. Shift windows **back 5–20 s**
  (chat reacts *after* the moment) and correct for broadcast delay.
- **Transcript**: faster-whisper `large-v3-turbo` int8 (VAD on — Whisper
  hallucinates on game audio), word timestamps. On 4 vCPU a 30-min VOD ≈
  3–8 min; or Groq `whisper-large-v3-turbo` at $0.04/audio-hour.
- **Fusion + rerank**: candidate windows = union of signal peaks → Claude
  Haiku scores each transcript window for hook/emotion/quotability and writes
  the title/hook per clip (~$0.03/VOD-hour; Batch API halves it). Snap clip
  boundaries to sentence/word timestamps (WhisperX alignment if we need
  ±30 ms cuts).

### 4. Music gate — before wasting a render
- YAMNet (CPU, faster than realtime) classifies music presence → AudD
  fingerprint lookup ($5/1k) on flagged segments.
- Commercial track found → **skip** the moment (music-dominant) or **strip**
  with Demucs and re-scan (speech-dominant). Never duck the volume — 
  fingerprinting is level-robust. There is **no safe duration**; sub-10 s
  matches trigger claims.
- Hard rule: **all clips ≤ 60 s.** Shorts between 61 s and 3 min with any
  Content ID claim are blocked outright.

### 5. Render — ffmpeg, spawned directly
- `fluent-ffmpeg` is deprecated/archived (May 2025) — spawn the `ffmpeg`
  binary with `child_process`, distro or BtbN build (verify `-filters`
  includes `drawtext`; install fonts + fontconfig).
- Layouts: center-crop / blurred-pad (`boxblur`, not `gblur` — 2× faster) /
  facecam-top + gameplay-bottom vstack. Per-account layout variation is part
  of the differentiation strategy.
- Captions: Whisper word timestamps → `.ass` with karaoke tags
  (`PlayResX:1080 / PlayResY:1920` or font sizes break), burned via
  `subtitles=` filter. TikTok-style bold, word-highlight.
- Branding: `Kick.com/WinslowBankz` centered overlay — the center is the one
  place all three platforms' UI never covers (keep critical content inside a
  centered ~900×1400 box; never bottom-right). Keep it clean — heavy
  watermarking now trips originality heuristics.
- Output: `-c:v libx264 -profile:v high -pix_fmt yuv420p -movflags +faststart
  -c:a aac -ar 48000`, 1080×1920. H.265 gains nothing (platforms re-encode).
- Budget ~1–3 min per clip end-to-end on a 4 vCPU box.

### 6. Publish — per-platform adapters behind one interface
Decision: **launch on a third-party posting API, migrate to official APIs as
audits clear.** The audits are the critical path, not the code:

| Platform | Official-API blocker | Time to clear |
|---|---|---|
| TikTok | Unaudited apps post **private-only** (SELF_ONLY), accounts must be private | Content audit ~2–4 weeks, strict UX rules |
| YouTube | Unverified API projects → uploads **locked private**, no appeal | Compliance audit, weeks→months |
| Instagram | **None for own accounts** — Standard Access + tester roles, no app review | Immediate |

- **Phase A (launch week):** Blotato ($29/mo, 20 accounts) or Post Bridge
  ($29/mo Creator) posts to TikTok + YouTube publicly through their audited
  apps; Instagram goes through our own Graph API integration from day one
  (`media_type=REELS`, public `video_url` from R2, poll container →
  `media_publish`).
- **Phase B:** file TikTok + YouTube audits immediately at project start;
  swap adapters to official APIs when approved. Interface stays identical.
- Rate realities baked into the scheduler: TikTok ~15 API posts/day/account
  (shared across ALL tools), 6 req/min/token; IG 100 posts/24h moving window
  (verify live via `GET /{ig_id}/content_publishing_limit`); YouTube 100
  uploads/day/project pooled across channels. Jitter posting ±15–90 min;
  never identical timestamps across accounts.

### 7. Measure — close the loop
- Pull per-post metrics (YouTube Analytics `engagedViews`, IG
  `ig_reels_avg_watch_time`, TikTok view/like/share counts) into Postgres.
- Feed back: which detected-signal mix produced clips that retained viewers →
  tune fusion weights and the LLM rubric. This feedback loop is the moat no
  off-the-shelf tool has.

## Hosting & stack

| Piece | Choice | Why |
|---|---|---|
| Runtime | **Node 24 (LTS)** everywhere | Vercel default since Nov 2025; Node 20 disabled there Oct 1, 2026. Rebuild native addons (better-sqlite3, sharp) for the new ABI |
| Dashboard/API | Next.js on Vercel | Webhooks + UI only; nothing heavy passes through it (4.5 MB body cap) |
| Worker | Docker on Hetzner CX33 (€8.49/mo) or similar 4 vCPU/8 GB | Runs capture, Whisper, ffmpeg, queues. GPU unnecessary at this scale |
| Queue | BullMQ + Redis (`maxmemory-policy=noeviction`) | Retries, backoff, rate-limited queues per platform account |
| DB | Postgres (Neon/Supabase) | VODs, moments, clips, accounts, posts, metrics |
| Storage | Cloudflare R2 | $0.015/GB-mo, **zero egress** — critical because Meta fetches every Reel from a public URL |
| Transcription | faster-whisper (CPU) → Groq API if too slow | $0 vs $0.02/30-min VOD |
| LLM | Claude Haiku 4.5 (scoring + titles), Batch API for backlog | ~$0.03/VOD-hour |
| Python sidecar | faster-whisper, librosa, YAMNet, Demucs | Called from Node worker via CLI/queue |

**Running cost ≈ $40–55/mo** (VPS ~$10 + third-party poster $29 + LLM ~$2 +
R2/AudD pocket change). Comparable buy-stack (Eklipse + Blotato ≈ $42/mo) has
no Kick stream-end trigger, no chat signal, no feedback loop, and Eklipse is
weak on IRL/just-chatting content — which is exactly the WinslowBankz format.

## Compliance guardrails (built in, not bolted on)

1. **Different clips per account** — the scheduler assigns each detected moment
   to exactly one account per platform. No mirrors, ever.
2. **Music gate before every publish** (stage 4). IRL clips are not exempt —
   store/car radio counts.
3. **≤60 s clips**, 9:16, clean exports per platform (TikTok-watermarked
   video is suppressed on Reels/Shorts).
4. **Account ops**: accounts created/warmed on residential IPs + real devices,
   staggered creation, 1–2 weeks manual native posting before API ramp
   (1/day → 2–3/day). API *posting* from the VPS is fine — creation/login
   from datacenter IPs is what gets flagged.
5. **Official branding**: "WinslowBankz Official Clips" naming + bio links to
   the Kick channel. Transparent operation is what separates a creator's clip
   network from a spam farm — and it's also what the platforms allow.
6. **Rights chain**: whoever operates the accounts that isn't the streamer
   keeps written permission from the streamer on file. If WinslowBankz ever
   signs a **Kick Partner** deal, re-check the contract — partner terms grant
   Kick an *exclusive* content license that can restrict off-platform clips
   (standard ToS is non-exclusive and fine).
7. **YouTube YPP**: raw uncommented rips can be denied monetization
   ("inauthentic content") even for your own footage — captions, hooks, and
   editing count as transformation, and the Feb 2027 10M-engaged-views rule
   means the YouTube clips channel needs to *earn* its slot.

## Repo layout (target)

```
winz/
├── apps/
│   ├── web/            # Next.js dashboard + Kick webhook receiver (Vercel)
│   └── worker/         # Node worker: queues, ffmpeg, publish adapters (VPS)
├── packages/
│   ├── core/           # shared types, DB schema, job contracts
│   ├── detect/         # signal fusion + LLM scoring
│   └── publish/        # platform adapters: instagram, youtube, tiktok, blotato
├── py/                 # faster-whisper, librosa, YAMNet, Demucs sidecar
├── docs/research/      # the Aug 2026 research sweep (12 docs)
└── ARCHITECTURE.md
```

## Build order

1. **Phase 0 — accounts & paperwork (now, runs in parallel with everything):**
   create the 6 accounts (residential IP, staggered), start manual warm-up;
   register Kick dev app; file TikTok + YouTube API audits; set up R2,
   Postgres, VPS.
2. **Phase 1 — capture + detect (week 1–2):** Kick webhook receiver, chat
   daemon, recorder, transcription, signal fusion, LLM scoring. Output:
   ranked moments with titles in the dashboard.
3. **Phase 2 — render + review (week 2–3):** ffmpeg pipeline, caption burner,
   watermark, music gate. Human clicks approve in the review queue — full
   auto comes later, after quality is proven.
4. **Phase 3 — publish (week 3–4):** IG official adapter + Blotato adapter,
   scheduler with jitter + per-account rate budgets.
5. **Phase 4 — measure & tune:** analytics pull, feedback into detection
   weights, then graduate accounts from review-queue to auto-post as trust
   builds.
