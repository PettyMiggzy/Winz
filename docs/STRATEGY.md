# Winz — Product Strategy

What Winz is, why it can win, and the order to build it. Synthesizes all three
research sweeps ([docs/research/](research/)). Read
[`BUSINESS-MODEL.md`](BUSINESS-MODEL.md) for the "why clips work" reasoning and
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the technical build.

## What Winz is

A SaaS that automates the small-streamer clip flywheel: a streamer connects
once, and after each stream Winz turns their best moments into branded, vertical,
captioned clips and distributes them across TikTok, YouTube Shorts, and
Instagram Reels — with the streamer's channel link on every clip driving viewers
back. **Free at launch, monthly subscription later.**

Winslow's channel (kick.com/adinross-scale it is not — kick.com/WinslowBankz)
is **tenant #1 and the live proof**: the machine that grows his channel is the
demo reel that sells the product.

## Why it can win (the wedge)

The market is *not* empty — Eklipse already ships a full connect-Kick →
auto-clip → auto-post loop. But there's a real, narrow, **time-boxed (~6 month)**
opening:

1. **Speed.** Eklipse waits for Kick's VOD (clips land 20–60 min after stream
   end). Winz captures live and posts within minutes.
2. **Price + simplicity.** Eklipse gates Kick behind ~$24.99/mo and has a pile
   of billing/quality complaints (Trustpilot 4.2, recurring "cut off the best
   moment" and surprise-charge reviews). Winz: flat $10–15/mo, Kick in the base
   tier, no credits, no add-ons.
3. **Kick-first + tri-platform autopilot.** True zero-touch to all three
   platforms with per-account differentiation, aimed at the Kick community
   before Eklipse reprioritizes.
4. **Own-footage safety as a feature.** The music gate + "your stream, your
   clips" framing keeps customer accounts alive — a real selling point given
   how many clip channels die to strikes.

The moat isn't the tech (all copyable in ~2 quarters) — it's **owning the Kick
small-streamer community first.**

## The decisive constraint: ingestion must be user-initiated

The most important technical finding across all sweeps:
**Kick's official API has no video endpoints, and none are on the roadmap.**
Every auto-Kick tool (Eklipse included) gets video by scraping undocumented,
Cloudflare-fenced endpoints — which for a *multi-tenant product* means:

- Winz's servers making the infringing copy (no DMCA safe harbor for that step)
- Bundling Cloudflare-bypass into a customer feature → potential DMCA §1201
  "trafficking" liability (no safe harbor, $200–2,500 per act, 20+ such suits
  filed by mid-2026)
- A technically fragile scraper that broke yt-dlp repeatedly in 2026

**So Winz is upload-first / capture-at-source, by design:**
1. **Browser extension** records the streamer's own authenticated Kick session
   (no proxy fight, no Winz-owned infringing copy) — *primary path*
2. **OBS / local-recording upload** (watch-folder) — highest quality
3. **Paste-your-own-VOD/clip-URL** — lowest friction, user-initiated
4. **Consented RTMP restream relay** via `streamkey:read` — higher fidelity,
   higher friction

This reshapes onboarding (it's not pure "connect and forget") and is *the*
central product tradeoff. It's also what keeps Winz on the right side of the
law that competitors are quietly gambling on.

## Unit economics (why the free tier is survivable — if capped)

Per active streamer at ~12 streams/mo × 30 min:

| Cost | Amount |
|---|---|
| Transcription (Groq Whisper turbo, $0.04/hr) | ~$0.24 |
| LLM highlight scoring + titles (Claude Haiku, batch) | ~$0.12–0.25 |
| Render compute (spot GPU or CPU) | ~$0.05–0.30 |
| Storage (Cloudflare R2, zero egress) | ~$0.05–0.15 |
| **Total** | **~$0.50–1.00 / active user / mo** |

→ **90%+ gross margin at $10–15/mo**, vs the 52–60% AI-native SaaS average.
The pipeline is transcription + LLM + ffmpeg (no expensive diffusion video gen),
so it's cheap. **But** a free user auto-processing 24h of streams costs $2–4/mo
in pure compute, and idle GPUs waste 30–50% of spend. So the free tier **must**
be capped: stream-minutes/month limit, watermark, 720p, short clip retention,
deprioritized render queue, spot/queue workers (never an always-on GPU).

Pricing guidance from the research: **don't meter upload-minutes** the way
OpusClip does (a 3-hour VOD burns 180 credits and kills signups) — meter
clips/automation/quality tiers the way streamer-native tools do. The $10–15/mo
band is where small streamers actually pay; $29 is repurposing-tool pricing.

## The real critical path: paperwork, not code

The pipeline is buildable in weeks. The *gates* take months and must start now,
in parallel:

| Gate | What it blocks | Lead time | Prereq |
|---|---|---|---|
| **LLC + company domain + email** | Everything downstream | 1–5 days | — |
| **Meta Business Verification** | IG publishing for customers | 5–15 days/cycle | LLC docs, legal-name match |
| **Meta App Review (Advanced Access)** | Same | 2–6 weeks, rejections common | live app + BV |
| **Meta Access/Tech-Provider check** | Same | ~5 days | BV |
| **TikTok Content Posting audit** | Public TikTok posts (else private forever) | 2–6 weeks | live public app, UX rules |
| **YouTube API compliance audit** | Public uploads + quota | weeks–months | one project, privacy policy |
| **Kick app verification** | 1K→10K event subscriptions | email developers@kick.com | client ID |
| **DMCA designated agent** | Safe-harbor from day 1 | same day, $6, renew /3yr | — |

Key ordering traps:
- **Never let a real customer post to TikTok before the audit passes** — posts
  made while unaudited are locked private *forever*. Same for YouTube (unverified
  project = uploads locked private).
- **Meta's fully-automatic posting is itself a rejection trigger** if demoed
  literally — the screencast must show a *user clicking publish*. Ship auto-post
  as an opt-in setting; demo the approval-queue flow.
- **Your TikTok creator cap = the number you type in the audit form** — estimate
  6–12 months ahead.
- **One landing-page sentence like "clip any streamer" is the plaintiff's
  Exhibit A** post-*Cox v. Sony* (2026). Market only "your stream, your clips."

Legal posture is otherwise favorable: *Cox v. Sony* (Mar 2026, unanimous) made
neutral tools liable only for *inducement*, DMCA safe harbor covers the
storage/processing layer (with a $6 agent + an *enforced* repeat-infringer
policy), competitors' ToS (OpusClip is the template) push rights onto the user,
and BOI/CTA reporting is dead for US LLCs. COPPA age-gate at 13+ (18+ safer).

## Build sequence

**Phase 0 — paperwork + foundation (start immediately, parallel to all code):**
form the LLC, buy the domain + company email, register the DMCA agent, stand up
a live marketing site with privacy policy + ToS (OpusClip-modeled), file the
Kick dev app, and begin the Meta/TikTok/YouTube audit applications the moment
the app is demoable under Standard Access.

**Phase 1 — the pipeline, single-tenant, Winslow as tenant #1:** build capture
(extension + upload) → transcription → 3-signal highlight detection → LLM
scoring/titles → music gate → ffmpeg render with karaoke captions + center
branding → review queue. `tenant_id` on every table from line one. Dogfood on
Winslow's streams under Standard Access (own accounts, no review needed) until
the clips are undeniably good. **His growth becomes the marketing.**

**Phase 2 — publishing + multi-tenancy:** Instagram official adapter (once
Advanced Access clears) + Blotato bridge for TikTok/YouTube until their audits
land; per-account rate budgets + jittered scheduling; the differentiation engine
(each account gets different clips). Tenant onboarding, billing, free-tier caps.

**Phase 3 — open beta (free):** onboard a handful of small Kick streamers from
the community (Kick Discord, r/kickstreaming). Watermark-on-free-tier viral loop
+ recurring-commission affiliate program (the proven GTM for this category).
Grandfather founding users' pricing.

**Phase 4 — paid tiers + measure/tune:** flip on subscriptions once the audits
are all cleared and quality is proven; feed per-post analytics back into
detection weights (the feedback loop no competitor has). Expand ingestion to
Twitch/YouTube sources to grow past the Kick-only TAM.

## What to tell Winslow now

Nothing here changes the [decision sheet](QUESTIONS-FOR-WINSLOW.md) — his
answers (budget, accounts, posting mode, Kick partner status, capture setup)
still gate Phase 1, and his channel is the proof regardless. The one addition:
if this is going to be a *product*, the LLC/domain/audit paperwork (Phase 0) is
the long pole and should start as soon as you two decide to commit — it's weeks
of waiting that runs in the background while the code gets built.
