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

## SaaS-pivot sweep (2026-08-15/16)

Added when the project pivoted from internal tool to multi-tenant platform.

| # | Doc | What it covers |
|---|-----|----------------|
| 13 | [meta-advanced-access](13-meta-advanced-access.md) | Meta's 3-gate process (Business Verification → App Review → Tech Provider check) to publish for third-party IG accounts; 4–8 weeks; LLC + company domain needed first |
| 14 | [api-audits-for-saas](14-api-audits-for-saas.md) | TikTok/YouTube/Kick app audits for a multi-tenant SaaS; one audited app serves all customers; TikTok creator cap = the estimate you file; unaudited posts stay private forever |
| 15 | [clipping-saas-liability](15-clipping-saas-liability.md) | DMCA 512 stack ($6 agent + enforced repeat-infringer policy), Cox v. Sony (2026) shield, §1201 trafficking risk of server-side ripping, competitor ToS teardown (OpusClip = the template), LLC/COPPA/beta-terms basics |
| 16 | [saas-pricing-gtm](16-saas-pricing-gtm.md) | COGS ~$0.50–1/active user/mo → 90%+ gross margin at $10–15/mo; don't meter upload-minutes for streamers; 2–3% freemium conversion planning; watermark viral loop + recurring-commission affiliates |
| 17 | [kick-ingestion-feasibility](17-kick-ingestion-feasibility.md) | **Decisive:** Kick's official API has no media endpoints and none are coming — compliant multi-tenant ingestion must be user-initiated (extension / OBS upload / paste URL / consented restream relay) |
| 18 | [competitive-wedge-teardown](18-competitive-wedge-teardown.md) | Eklipse already ships the full loop (20–60 min lag, $24.99, reputation issues) — the wedge is speed + flat $10–15 pricing + Kick-first community capture, and it's time-boxed ~6 months |
