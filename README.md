# Winz

Automated content-distribution machine for the **[Kick.com/WinslowBankz](https://kick.com/WinslowBankz)** channel:

> Stream ends on Kick → AI finds the best moments → renders branded 9:16 clips
> with captions and hooks → distributes them across TikTok, YouTube Shorts,
> and Instagram Reels — automatically.

## Status

**Research phase complete** (2026-08-15). Architecture locked, build starting.

- 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)** — the full system design, stack,
  costs, compliance guardrails, and build order. **Start here.**
- 🔬 **[docs/research/](docs/research/README.md)** — the 13-agent research
  sweep behind every decision: Kick API, all three platform posting APIs,
  highlight detection, FFmpeg pipeline, hosting, competitors, platform
  policy, music copyright, and account operations.

## The short version

| Question | Answer |
|---|---|
| Is it buildable? | Yes — and no commercial tool does the full Kick-native loop |
| Node version | **Node 24 LTS** (Vercel default; Node 20 disabled there Oct 1, 2026) |
| Where it runs | Dashboard on Vercel · video worker on a ~$10/mo VPS · clips on Cloudflare R2 |
| Stream-end trigger | Official Kick webhook `livestream.status.updated` |
| Highlight detection | Audio spikes + chat velocity + Whisper transcript scored by Claude Haiku |
| Posting | Instagram via official API day one; TikTok/YouTube via Blotato until our own API audits clear |
| Accounts | 2 per platform with **different** clips each — platforms fingerprint duplicate video across accounts, so 4 mirrors get suppressed, not amplified |
| Running cost | ~$40–55/mo |

## Key constraints discovered in research

1. Kick has **no official VOD API** — we capture the broadcast ourselves
   (recorder + live chat daemon) instead of scraping.
2. TikTok and YouTube both lock API posts to **private** until an app
   audit passes — filed at project start; Blotato bridges the gap.
3. Every platform scans uploads for music — clips are music-gated
   (detect → skip or strip) before publish, and capped at **60 seconds**.
4. Duplicate video across accounts is fingerprinted and suppressed —
   differentiation per account is a core scheduler feature, not a nice-to-have.
