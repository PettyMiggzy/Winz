# Research Index

Deep research sweep run 2026-08-15 (13 parallel research agents + completeness critic).
Everything here feeds [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) — read that first; come here for the receipts.

| # | Doc | What it covers |
|---|-----|----------------|
| 01 | [kick-api](01-kick-api.md) | Kick official API, OAuth 2.1, `livestream.status.updated` webhook (stream-end trigger), unofficial VOD endpoints, chat capture via Pusher, yt-dlp support |
| 02 | [tiktok-api](02-tiktok-api.md) | Content Posting API, the audit requirement (unaudited = private-only posts), ~15 posts/day/account cap, multi-account OAuth, third-party posting APIs |
| 03 | [youtube-api](03-youtube-api.md) | Data API v3 uploads (now 100/day), the unverified-project private-lock, Shorts classification rules, brand channels, Feb 2027 Shorts monetization cliff |
| 04 | [instagram-api](04-instagram-api.md) | Reels publishing flow, Standard Access = **no app review for your own accounts**, 100 posts/24h, public `video_url` requirement |
| 05 | [highlight-detection](05-highlight-detection.md) | Audio RMS z-scores, chat-velocity spikes, faster-whisper + LLM transcript scoring, open-source prior art, cost per VOD |
| 06 | [video-pipeline](06-video-pipeline.md) | FFmpeg 16:9→9:16 patterns, ASS karaoke captions from Whisper timestamps, watermark safe zones, per-platform encode specs, render-time reality on cheap VPS |
| 07 | [deployment](07-deployment.md) | Vercel Node 24 (default since Nov 2025; Node 20 dies Oct 1, 2026), why Vercel can't run the video worker, VPS pricing, R2 storage, BullMQ |
| 08 | [competitors](08-competitors.md) | OpusClip / Eklipse / StreamLadder / distribution APIs pricing, the N3on human-clipper economy, gap analysis |
| 09 | [platform-policy](09-platform-policy.md) | Multi-account rules, content fingerprinting, why 4 mirror accounts per platform gets suppressed, the working 2026 pattern |
| 10 | [music-copyright-clip-rights](10-music-copyright-clip-rights.md) | Content ID / Rights Manager / TikTok muting, no "safe duration" myth, Shorts >60s + claim = blocked, music-detection & stripping pipeline, rights chain |
| 11 | [kick-tos-and-capture-architecture](11-kick-tos-and-capture-architecture.md) | Kick ToS vs unofficial endpoints, legal exposure analysis, why OBS local recording is the clean capture path, VOD retention windows |
| 12 | [account-ops-and-metadata-playbook](12-account-ops-and-metadata-playbook.md) | Account creation/warm-up playbook, residential-IP rules, caption/hashtag/hook meta for 2026, A/B measurement endpoints |
