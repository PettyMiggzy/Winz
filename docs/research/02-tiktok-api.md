# Research: tiktok-api

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

TikTok's official Content Posting API (v2) remains free and supports two modes — Direct Post (publishes immediately, scope video.publish) and Upload/Inbox draft (scope video.upload, user finishes in-app). Until an app passes TikTok's content audit, all posts are forced to SELF_ONLY, posting accounts must be private, and only 5 users per 24h may post; the audit takes days-to-weeks (commonly 2-4 weeks) and requires a compliant UX plus demo video. One audited app can post to many accounts (one OAuth grant + token pair per account, no published connected-account cap), but each creator account has an unpublished daily post cap (~15/day, shared across all API clients) and 6 requests/min per user token. Third-party services (Ayrshare $149+, Blotato $29+, upload-post free-$438, Post Bridge ~$9-49, Late/Zernio free-usage-based) run their own audited apps so posts are public immediately; unofficial browser/reverse-engineered automation violates TikTok's Community Guidelines and is being actively enforced in 2025-2026 (throttled uploads, "Automated Network Coordination" bans).

## Key facts

- Direct Post endpoint: POST /v2/post/publish/video/init/ (scope video.publish); Draft/Inbox: POST /v2/post/publish/inbox/video/init/ (scope video.upload); status polling: POST /v2/post/publish/status/fetch/; mandatory pre-publish call: POST /v2/post/publish/creator_info/query/
- Unaudited clients (current official rule, verified Aug 2026): all posts restricted to SELF_ONLY, posting user accounts must be set to private at time of posting, and max 5 users may post per 24-hour window per client
- Audit is a two-stage process: product-access review (days) then Content Posting audit (weeks; third-party reports commonly cite 2-4 weeks with multiple feedback rounds); requires demo video of full OAuth+composer+post flow and strict UX compliance (manual privacy selection with no default, creator nickname display, commercial-content toggle, Music Usage Confirmation text, no watermarks)
- Multi-account: OAuth 2.0 per TikTok account — each account that authorizes the app gets its own access_token (24h / 86,400s) and rotating refresh_token (365 days); no published cap on connected accounts for audited apps, so 4 accounts owned by one creator = 4 separate OAuth grants under one developer app (fits under the 5-user pre-audit cap too)
- Rate limits: 6 requests/minute per user access_token on posting endpoints; daily post cap per creator is unpublished (error spam_risk_too_many_posts) — widely reported at ~15 posts/day (guidelines fetch cited ~15 per creator/day; some report 15-25 by account tier) and it is shared across ALL API clients posting to that account; draft/inbox mode: max 5 pending uploads per 24h
- Video specs: MP4 (recommended)/WebM/MOV; H.264 recommended (H.265, VP8, VP9 accepted); 23-60 FPS; 360x360 min to 4096x4096 max; up to 10 min via API but capped by creator_info max_video_post_duration_sec; max file 4 GB; title max 2,200 UTF-16 runes
- Chunked upload: PUT to returned upload_url (open-upload.tiktokapis.com) with Content-Range headers; chunk size 5 MB min / 64 MB max (final chunk up to 128 MB); max 1,000 chunks, sequential order; files <5 MB = single chunk; upload_url expires after 1 hour; 206 = chunk accepted, 201 = complete
- Third-party pricing (Aug 2026): Ayrshare Premium $149/mo (1 profile, ≤13 network accounts), Launch $299 (10 profiles), Business $599 (30 profiles, overages $8.99→$2.49/profile); Blotato Starter $29 (20 accounts), Creator $97 (40), Agency $499; upload-post.com Free (2 profiles/10 uploads), $24 (5 profiles), $50 (25), $147 (75), $438 (225) — unlimited uploads on paid; Post Bridge ~$9 Starter / $29 Creator (15 accounts) / $49 Pro (unlimited accounts), API add-on ~$5/mo; Late (getlate.dev) Free (2 profiles/20 posts), Build $19, Accelerate $49 — but getlate.dev/pricing now 301-redirects to zernio.com (usage-based: 2 accounts free, then $6/$3/$1 per account/mo)
- Third-party services run their own already-audited TikTok developer apps, so customer posts are publicly visible immediately with no audit — but TikTok's per-creator daily cap still applies and is shared across tools
- Unofficial automation enforcement 2025-2026: TikTok Community Guidelines prohibit 'using automation to run many accounts or send repetitive content'; ban reason 'Automated Network Coordination' appearing on accounts since ~2025; TikTok says it intercepts tens of billions of fake engagement attempts/year; Selenium uploader maintainers report silent upload throttling and warn of account bans

## Gotchas

- Unaudited apps CAN call the API without errors in most of the flow, but every post silently lands as SELF_ONLY — and creator_info may still advertise PUBLIC_TO_EVERYONE pre-audit, so integrations look working until you check the actual post visibility
- Pre-audit, posting accounts must be PRIVATE accounts at posting time, and only 5 distinct users per 24h may post through the client
- TikTok's guidelines formally prohibit apps built only for internal/private use — a personal tool automating your own 4 accounts may be rejected at audit; the demo video must show a real product UX (manual privacy dropdown with no default, commercial content toggle, Music Usage Confirmation text, no watermarks)
- The audit is a review queue measured in weeks (commonly 2-4, plus days per resubmission); plan for it or use a third-party audited platform
- Daily post cap (~15/day, unpublished, tier-dependent) is per TikTok account and SHARED across all API clients — stacking multiple tools does not raise it; exceeding returns spam_risk_too_many_posts
- Draft/inbox mode allows only 5 pending uploads per 24h and requires the user to finish the post inside the TikTok app; drafts expire if not completed
- Access tokens last only 24h and refresh tokens ROTATE — store the new refresh_token on every refresh or you lose the account connection; refresh tokens die after 365 days requiring re-OAuth
- PULL_FROM_URL requires domain/URL-prefix verification per app (including CDN subdomains), HTTPS with no redirects; photo posts are PULL_FROM_URL only
- Branded/commercial content cannot be posted as private — conflicts with pre-audit SELF_ONLY, so commercial flows are untestable end-to-end before audit
- Even via the official API, recycled or watermarked content increasingly triggers spam_risk_user_banned_from_posting — content quality is now an enforcement vector
- Unofficial automation (Selenium/reverse-engineered endpoints) violates Community Guidelines; 2025-2026 enforcement includes silent upload throttling and permanent 'Automated Network Coordination' bans that can sweep all associated accounts, especially multi-account setups sharing IP/device fingerprints
- Third-party pricing is volatile: Ayrshare's entry tier jumped from ~$49 to $149/mo; Late (getlate.dev) appears mid-rebrand — its pricing page 301-redirects to zernio.com with a completely different usage-based model (verify before committing)
- Blotato's 7-day free trial terminates the moment you generate an API key
- Some vendors claim API direct posts get less organic reach than posts finished natively in-app (upload-post recommends draft mode for reach) — anecdotal and unverified by TikTok

## Full details

# Programmatically Posting Videos to TikTok — Research Findings (Aug 2026)

## 1. Official Content Posting API: Direct Post vs Upload (Draft), and the Audit

### Two posting modes
| | Direct Post | Upload (Inbox/Draft) |
|---|---|---|
| Init endpoint | `POST https://open.tiktokapis.com/v2/post/publish/video/init/` | `POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/` |
| Scope | `video.publish` | `video.upload` |
| Result | Published straight to profile with caption/privacy/interaction settings set via API | Video lands in the user's TikTok inbox as a draft; the user must tap the inbox notification and finish editing/publishing **inside the TikTok app** |
| Metadata via API | title (≤2,200 UTF-16 runes), `privacy_level`, disable comment/duet/stitch, video cover timestamp (ms), brand content + AIGC flags | Minimal — user sets everything in-app |
| Daily limit | Unpublished daily cap (see §3) | **Max 5 pending uploads per 24h** per user |

Photos: `POST /v2/post/publish/content/init/` (photo posts use `PULL_FROM_URL` only; WebP/JPEG, ≤20 MB/image, max 1080p). Status polling for all modes: `POST /v2/post/publish/status/fetch/` (processing takes minutes; apps are required to poll and surface status).

**Mandatory pre-publish call**: `POST /v2/post/publish/creator_info/query/` — returns `privacy_level_options`, `max_video_post_duration_sec`, whether comment/duet/stitch are disabled, and creator nickname. The `privacy_level` you send **must** match one of the returned options or you get `privacy_level_option_mismatch` (403). The audit requires your UI to be built from this response.

### Unaudited-client restriction (exact current rules)
From TikTok's official docs (developers.tiktok.com, verified Aug 2026):
- **All content posted by unaudited clients is restricted to private viewing mode (`SELF_ONLY`)**. Direct Post with any public level returns `unaudited_client_can_only_post_to_private_accounts` (403).
- **All user accounts posting through an unaudited client must be set to private at the time of posting.**
- **Max 5 users may post in a 24-hour window** per unaudited client.
- Trap: `creator_info` may still list `PUBLIC_TO_EVERYONE` in `privacy_level_options` pre-audit, creating false confidence — the post still ends up private/fails.
- Sandbox: up to 5 sandboxes per app, each shareable with up to 10 target TikTok accounts, for testing the full flow pre-review.

### Audit process — what it takes to pass
Two distinct stages:
1. **Product access / app review** (days): add "Content Posting API" to your app in the developer portal; form describing the app, users, links to live website + privacy policy/ToS. Unlocks endpoints (posts still private).
2. **Content Posting audit** (weeks — third-party reports consistently cite **2–4 weeks**, sometimes longer with resubmissions): TikTok reviews a **screen-recording demo video** showing: login + consent flow, a composer built from the `creator_info` response, the post appearing on the profile, and visible caption/privacy/interaction confirmation.

UX requirements enforced at audit (from official Content Sharing Guidelines):
- Display the creator's nickname (so users know which account posts).
- Privacy level must be **manually chosen from a dropdown with no default**, populated from `privacy_level_options`.
- Interaction toggles (comment/duet/stitch) present, grayed out where the creator disabled them.
- Commercial-content disclosure toggle with "Your brand" (Brand Organic) and "Branded content" checkboxes; **branded content cannot be posted private**.
- Compliance line: "By posting, you agree to TikTok's Music Usage Confirmation" (plus Branded Content Policy where applicable).
- Content preview + explicit user consent per post; notify user processing takes minutes; poll status API.
- **No promotional watermarks** or uneditable preset text.

Common rejection reasons: scope overreach, unreachable policy pages, composer not respecting creator settings, incomplete auth flow in the demo. **Officially prohibited: apps "limited to internal/private use"** — TikTok expects a real product with real users, which is a genuine obstacle if you only want to automate your own 4 accounts; also prohibited: reposting arbitrary content scraped from other platforms, sharing client secrets.

## 2. One developer app → multiple TikTok accounts
- Yes. TikTok uses standard **OAuth 2.0 per user account** (Login Kit). Each of the 4 accounts completes the authorize flow once and the app receives a separate token pair per account:
  - `access_token`: expires **86,400 s (24 h)**.
  - `refresh_token`: valid **365 days**, and **rotates** — the refresh response may return a new refresh_token you must store.
  - Token endpoints: `POST https://open.tiktokapis.com/v2/oauth/token/` (exchange + refresh), `POST https://open.tiktokapis.com/v2/oauth/revoke/`.
- **No published limit on the number of connected accounts** for an audited app (third-party platforms run thousands of accounts on one app). Pre-audit, the binding limit is the **5 posting users per 24 h** cap — so 4 accounts fit even before audit, but only as private SELF_ONLY posts.
- Rate limits are enforced **per user access_token** for posting, so 4 accounts get 4 independent per-account quotas; a per-app global quota also exists for other endpoints (per-minute sliding window, HTTP 429 `rate_limit_exceeded`; increases via TikTok support request).

## 3. Rate limits and video specs
**Request limits**
- Posting init endpoints: **6 requests/minute per user access_token** (both direct-post and inbox init).
- Other API v2 endpoints: e.g. `/v2/user/info/`, `/v2/video/list/`, `/v2/video/query/`: 600 req/min per endpoint, one-minute sliding window; 429 + `rate_limit_exceeded` on breach; quota increases via support page.

**Posting caps**
- Daily post cap per creator: **unpublished**; hitting it returns `spam_risk_too_many_posts` (403). Official guidelines text referenced ~**15 posts per creator per day** (applies to audited AND unaudited clients); ecosystem reports say 15–25 depending on account tier. The cap is **per TikTok account and shared across every API client** posting to it — using multiple tools doesn't multiply it.
- Draft/inbox mode: **max 5 pending uploads per 24 h**.
- Other spam errors seen even on the official API: `spam_risk_user_banned_from_posting` (increasingly triggered by recycled/watermarked content).

**Video specs (official Media Transfer Guide)**
- Formats: MP4 (recommended), WebM, MOV; codecs H.264 (recommended), H.265, VP8, VP9.
- Frame rate 23–60 FPS; resolution 360×360 min to 4096×4096 max.
- Duration: up to **10 minutes via API**, but capped per-creator by `max_video_post_duration_sec` from creator_info (often 300 s for some accounts).
- Max file size: **4 GB**.

**Chunked upload protocol (FILE_UPLOAD)**
- Init returns `publish_id` + `upload_url` (open-upload.tiktokapis.com); URL valid **1 hour**.
- `PUT {upload_url}` with `Content-Type`, `Content-Length`, and `Content-Range: bytes {first}-{last}/{total}`.
- Chunk size: **min 5 MB, max 64 MB** (final chunk may be up to **128 MB**); **1–1,000 chunks**, uploaded **sequentially**; files <5 MB go as one chunk with chunk_size = file size.
- Responses: `206` chunk accepted, `201` upload complete (posting begins), `416` range mismatch, `403` URL expired, `5xx` retry.

**PULL_FROM_URL**
- HTTPS only, no redirects, URL must stay downloadable (~1 h timeout).
- Requires **domain verification or URL-prefix verification** registered per app in the developer portal (covers CDN subdomains too). Photos require PULL_FROM_URL.

## 4. Third-party posting APIs (they own the audited TikTok app → your posts are public immediately)
All prices verified Aug 2026 from vendor pages unless noted; this market changes prices frequently.

| Service | Plans (monthly) | Accounts/profiles | Notes |
|---|---|---|---|
| **Ayrshare** (ayrshare.com) | Premium **$149**, Launch **$299**, Business **$599**, Enterprise custom | Premium: 1 profile (≤13 network connections); Launch: 10 profiles; Business: 30 included, up to 300 (overage $8.99/profile for 31–100, $3.49 for 101–500, $2.49 above) | "Profile" = one customer/brand; TikTok + 12 other networks on all tiers. Note: prices rose sharply vs. the old $49 entry tier still quoted by older blogs |
| **Blotato** (blotato.com) | Starter **$29**, Creator **$97**, Agency **$499** | 20 / 40 / (agency-scale) connected accounts | Starter cites "up to 900 TikTok posts/month"; n8n & Make nodes; 7-day trial **excludes API** (generating an API key ends the trial) |
| **upload-post.com** | Free **$0**, Basic **$24**, Professional **$50**, Advanced **$147**, Business **$438** (annual ≈40% off) | 2 / 5 / 25 / 75 / 225 profiles | Free = 10 uploads/mo; paid = unlimited uploads. Official TikTok API, **direct post or draft mode**. Endpoints: `POST /api/upload`, `/api/upload_photos`, `/api/upload_text`, `GET /api/uploadposts/history`, `POST /api/uploadposts/schedule`; auth `Authorization: Apikey KEY` |
| **Post Bridge** (post-bridge.com) | Starter ~**$9**, Creator **$29**, Pro **$49**, Enterprise custom (yearly ~40% off; site rate-limited during research — figures from 2026 reviews) | Starter ~5, Creator 15, Pro unlimited | Unlimited posts; **API is a paid add-on (~$5/mo)**; 7-day trial, no free tier |
| **Late** (getlate.dev) | Free (2 profiles, 20 posts/mo), Build **$19** (10 profiles), Accelerate **$49**, Unlimited tier | per-plan profile counts; 1 account per network per profile | **Caution:** as of Aug 2026 `getlate.dev/pricing` 301-redirects to **zernio.com/pricing** (apparent rebrand/migration), which uses usage-based pricing: first 2 accounts free, accounts 3–10 $6/each/mo, 11–100 $3, 101+ $1 (e.g., 100 accounts ≈ $318/mo), all features + API included |

For 4 accounts owned by one creator: cheapest workable options are upload-post Basic ($24/mo, 5 profiles), Post Bridge Starter/Creator, Late/Zernio (~$12/mo for accounts 3–4 after 2 free), or Blotato Starter ($29, 20 accounts). Ayrshare is the enterprise-grade outlier at $149 for 1 profile (a "profile" can hold all 4 TikTok accounts only if they're treated as one brand — TikTok counts as 1 of 13 connections per profile, so 4 TikTok accounts likely means 4 profiles → Launch $299). **Even via these services, TikTok's per-account daily cap (~15) and content-based spam filters still apply.**

## 5. Risk of UNOFFICIAL automation (browser bots / reverse-engineered endpoints)
- **Policy**: TikTok Community Guidelines (Integrity & Authenticity → spam/deceptive behavior) explicitly ban "using automation to run many accounts or send repetitive content," bots/scripts for fake engagement, and AI/bot accounts driving traffic. ToS prohibits unauthorized/automated access to non-public interfaces.
- **Enforcement climate 2025–2026**: active and tightening. Users report permanent bans labeled **"Automated Network Coordination"** (a phrase TikTok has never publicly defined) — associated with multi-account automation patterns. TikTok states it intercepts **tens of billions of fake engagement attempts per year**. Detection includes device fingerprinting and signed-request anti-bot algorithms (X-Argus/X-Ladon family), which also make reverse-engineered mobile endpoints fragile and short-lived.
- **Observed failure ladder** (from maintainers of tools like `wkaisertexas/tiktok-uploader` (Selenium) and `makiisthenes/TiktokAutoUploader` (requests-based)): silent upload failures/throttling after too many uploads → temporary posting blocks → account bans; maintainers explicitly warn "usage may ban your account." Multi-account operation from one IP/device fingerprint raises coordinated-behavior flags that can take down **all** linked accounts.
- Even on the **official** API, TikTok now fires `spam_risk_too_many_posts` and `spam_risk_user_banned_from_posting` more aggressively for recycled/watermarked content — enforcement is shifting to content/behavior signals, not just endpoint legality.
- Practical conclusion for 2026: for accounts you care about, unofficial automation is a real ban risk with no appeal leverage; official API (own audited app) or a third-party audited platform are the only durable paths.

## Recommended architecture for the "4 accounts, one creator" case
1. **Fastest**: third-party (upload-post $24/mo, Post Bridge, Blotato $29/mo, Late/Zernio) — public posts on day one, they carry the audit.
2. **Own app**: register at developers.tiktok.com → add Login Kit + Content Posting API → OAuth all 4 accounts (each gets 24h access / 365d rotating refresh tokens) → build guideline-compliant composer → pass content audit (budget 2–6 weeks; risk: "internal use only" apps are formally prohibited) → Direct Post publicly, ~15 posts/day/account, 6 req/min/token.
3. Draft-mode compromise: inbox upload keeps a human in the loop (finish in app) — some tools claim in-app finished posts get better reach than API direct posts (anecdotal, unverified).

## Sources

- [TikTok Content Posting API — Get Started (official)](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [TikTok Content Posting API — Direct Post Reference (official)](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Content Posting API — Upload Video (Inbox/Draft) Reference (official)](https://developers.tiktok.com/doc/content-posting-api-reference-upload-video)
- [TikTok Content Posting API — Media Transfer Guide (official; chunk protocol, specs)](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide)
- [TikTok Content Sharing Guidelines (official; unaudited caps, UX/audit requirements)](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [TikTok API v2 Rate Limits (official)](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit)
- [TikTok OAuth User Access Token Management (official; token lifetimes)](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [TikTok Login Kit Overview (official; OAuth 2.0)](https://developers.tiktok.com/doc/login-kit-overview/)
- [bundle.social — TikTok API Approval: Audit, Scopes, Rejections](https://bundle.social/blog/tiktok-api-approval)
- [Blotato — TikTok API Pricing breakdown 2026 (incl. Blotato plans)](https://www.blotato.com/blog/tiktok-api-pricing)
- [Blotato Pricing](https://www.blotato.com/pricing)
- [Ayrshare Pricing](https://www.ayrshare.com/pricing/)
- [upload-post.com full docs & pricing (llms-full.txt)](https://www.upload-post.com/llms-full.txt)
- [Post Bridge (official site)](https://www.post-bridge.com/)
- [PostBridge Pricing 2026 (PostPlanify review)](https://postplanify.com/postbridge-pricing)
- [SocialRails — Post Bridge Review 2026](https://socialrails.com/blog/post-bridge-review)
- [Late — Pricing (redirects to zernio.com as of Aug 2026)](https://getlate.dev/pricing)
- [Zernio Pricing (Late redirect target)](https://zernio.com/pricing)
- [Late — TikTok API for Developers](https://getlate.dev/tiktok-api)
- [PostPeer — TikTok Content Posting API in 2026: Direct Post, Audit, Alternatives](https://www.postpeer.dev/blog/best-tiktok-posting-api)
- [Phyllo — TikTok API Rate Limits 2026](https://www.getphyllo.com/post/tiktok-api-rate-limits-in-2026-quotas-errors-workarounds)
- [Storrito — TikTok Post Limits (per-account daily caps)](https://storrito.com/help-center/tiktok-post-limits/)
- [openhosst — TikTok Automation 2026: What's Allowed, What Gets You Banned](https://openhosst.com/blog/tiktok-automation)
- [Blotato — Social Media Automation Rules: What Gets AI Agents Banned](https://www.blotato.com/blog/ai-agent-social-media-ban-rules)
- [TikTok discover — 'Automated Network Coordination' ban reports](https://www.tiktok.com/discover/your-account-is-banned-due-to-automated-network-coordination)
- [GitHub — wkaisertexas/tiktok-uploader (Selenium; ban warnings)](https://github.com/wkaisertexas/tiktok-uploader)
- [GitHub — makiisthenes/TiktokAutoUploader (requests-based; throttling reports)](https://github.com/makiisthenes/TiktokAutoUploader)
- [Zernio — TikTok API error codes reference](https://zernio.com/tiktok/errors)
