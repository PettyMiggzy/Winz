# Winz — Pricing & Packaging

Source of truth for tiers. Grounded in the pricing/GTM and platform-policy
research ([docs/research/16](research/16-saas-pricing-gtm.md),
[09](research/09-platform-policy.md), [03](research/03-youtube-api.md),
[12](research/12-account-ops-and-metadata-playbook.md)).

## Principle: meter accounts + automation + quality, never upload-minutes

Metering source-minutes (OpusClip's model) punishes streamers — a single
3-hour VOD burns ~180 "credits." Winz meters what actually scales value:
**how many accounts** you distribute to, **how much automation** (cadence,
auto-post), and **output quality** (resolution, compilations, A/B). COGS is
only ~$0.50–1.00 per active user/mo, so margins stay ~90% across the ladder.

## The ladder

| | **Free (beta)** | **Creator** | **Pro** | **Agency** (later) |
|---|---|---|---|---|
| Price | $0 | ~$12–15/mo | ~$29/mo | custom |
| TikTok accounts | 1 | 2 | 4 | more |
| Instagram accounts | 1 | 2 | 4 | more |
| YouTube channels | 1 | 1 | 2 | 2–3 |
| Auto-post | ✓ (manual approve) | ✓ | ✓ | ✓ |
| Resolution | 720p, watermark | 1080p | 1080p60, no watermark | 1080p60 |
| Stream-minutes/mo | capped | generous | high | highest |
| Best-of compilations | — | — | ✓ | ✓ |
| Per-account hook A/B | — | — | ✓ | ✓ |
| Multi-streamer / team seats | — | — | — | ✓ |
| Guided setup + warm-up | ✓ | ✓ | ✓ | ✓ |

Pricing in this category churns fast (Eklipse repriced, Powder shut down) —
treat these numbers as a starting point, keep them easy to change, and
grandfather founding users.

## Why YouTube is capped lower in every tier

YouTube's Feb 2027 rule requires **10M engaged Shorts views per channel per
90 days** to earn Shorts ad revenue. Splitting views across many channels means
none of them reach that line. And gaming Shorts RPM is the lowest of any format
(~$0.02–0.08/1K) — the real YouTube money is **one channel** running 10–30 min
"best of" compilations at $1–4 RPM, plus the funnel back to Kick. So:

- **1 YouTube channel** on Free/Creator, **2** on Pro (the 2nd is treated as
  discovery, not a monetization play).
- Never shard across multiple Google Cloud projects to multiply API quota —
  that violates YouTube policy. Request a quota increase on one project.

TikTok and Instagram have no equivalent per-channel monetization cliff, so
their slots scale wider.

## Account setup is a product surface, not a cost we eat

Account **creation + warm-up** must happen on the user's own phone/residential
IP (see [docs/research/12](research/12-account-ops-and-metadata-playbook.md)).
API **posting** afterward is normal from the cloud. So the product:

1. **Guides** creation with a wizard (`/dashboard/onboarding`) — handles, bios,
   the safety rules, staggered schedule.
2. **Tracks warm-up state** per account (new → warming → ready).
3. **Auto-ramps** posting: 0 → 1 → 2 → 3 → tier cap over 14 days
   (`src/lib/ramp.ts`), which is the safe cadence, applied automatically.

A higher tier unlocks **account slots + the guided ramp** for them — not an
instant switch.

## What Winz never sells

- Pre-made / aged / phone-verified accounts.
- Proxy or anti-detect-browser setups.
- View boosts or any engagement inflation.

These are what get customers banned and would make Winz liable for a
coordinated-inauthentic pattern. The product creates nothing on a user's behalf;
it guides safe setup and automates posting to accounts the user connects.

## Future: clipper mode (the scalable distribution model)

Big streamers (Adin Ross, N3on) don't warm up their own accounts — they pay
~1,000 clippers who post from their *own* already-aged accounts (see
[docs/research/22](research/22-clipper-economy.md),
[27](research/27-kick-clipping-program-ground-truth.md)). A future Winz
"clipper mode" could let a creator approve outside clippers to pull their best
clips and post from their own accounts — sidestepping warm-up entirely and
scaling reach the way the big networks do, without Winz creating any accounts.
