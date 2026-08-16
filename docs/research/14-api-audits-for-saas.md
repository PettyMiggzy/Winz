# Research: api-audits-for-saas

_Research date: 2026-08-15/16 (SaaS-pivot sweep). Requirements, prices, and timelines are time-sensitive — recheck official sources before relying on them._

## Summary

For a multi-tenant Winz, all three platforms gate scale behind one-time app-level reviews of YOUR app (not per-customer): TikTok's Content Posting audit (1-4+ weeks, strict UX checklist, demo video; being a real public SaaS helps since personal/internal tools are explicitly disallowed; post-audit you get a creator cap based on the daily-active-creator estimate you give in the audit form, plus a ~15 posts/day/creator platform cap), YouTube's Audit & Quota Extension Form (mandatory before exceeding the new default of 100 videos.insert calls/day per project — uploads got 16x cheaper Dec 4, 2025 and moved to their own quota bucket June 1, 2026; extensions take weeks to months and multiple-project workarounds violate policy III.D.1.c), and Kick's lightweight app verification (email developers@kick.com; grants verified bot badge and raises event subscriptions 1,000→10,000). Every major hosted scheduler (Buffer, Later, Metricool, Blotato, bundle.social) runs ONE audited app for all customers; the per-customer-app model only exists in self-hosted tools (Postiz/Mixpost) and produces documented audit rejections.

## Key facts

- TikTok unaudited apps: max 5 users posting per 24h, all posts forced SELF_ONLY, posting accounts must be private — and posts made while unaudited stay private forever (cannot be flipped public after approval).
- TikTok post-audit caps: a 24-hour active-creator cap per API client set from the usage estimate YOU provide in the audit application form (raising it later requires contacting TikTok), plus a per-creator daily post cap of ~15 posts/day shared across all API clients (spam_risk_too_many_posts).
- TikTok audit timeline 2025-2026 reports: product access in days; Direct Post audit 1-2 weeks clean first pass, 5-10 business days to 2-4 weeks typical (Mixpost documents 2-4 weeks), 2-6 weeks with rejection/resubmit cycles; each UX mistake sends you back in the queue.
- TikTok explicitly rejects apps intended for 'private/personal use' or in development/testing — a real multi-user SaaS with a fully developed public website (privacy policy + ToS visible without opening a menu) is what the review guidelines demand; no legal business entity strictly required, but an Organization developer account with business verification is recommended and mandatory for monetization features.
- YouTube quota changed Dec 4, 2025: videos.insert dropped ~1600→~100 units; June 1, 2026: granular buckets — defaults are now 100 videos.insert calls/day + 100 search.list calls/day + 10,000 units/day for everything else, per project across ALL tenants.
- YouTube: any quota beyond default requires the Audit and Quota Extension Form (compliance audit mandatory); audits completed in the last 12 months allow top-ups without full re-audit; real timelines: 'several weeks' routinely, forum reports of 4+ weeks of silence post-remediation and one 5-month quota-increase delay (Oct 2025).
- YouTube policy III.D.1.c: exactly one API project per API client — spreading tenants across multiple GCP projects to dodge quota is a policy violation; quota is per project, never per end-user, so a hosted SaaS must win extensions on one project.
- Videos uploaded via videos.insert from unaudited/unverified API projects (created after July 28, 2020) are locked to private until the project passes the audit — YouTube's equivalent of TikTok's SELF_ONLY restriction.
- Kick app verification: email developers@kick.com with Client ID, app name, justification (user base size, impersonation concerns, subscription capacity) + supporting docs; grants a verified badge on the bot account and raises event/chat subscription limits from 1,000 to 10,000; Kick also runs a $100,000 Kick Dev fund (launched March 6, 2025) rewarding third-party streamer tools.
- Every major hosted scheduler (Buffer, Later, Metricool, Hootsuite, Blotato, bundle.social) uses ONE audited developer app per platform serving all customers; Later holds TikTok's inaugural Content Marketing Partner badge. The per-customer-app model exists only in self-hosted tools (Postiz, Mixpost), where every customer must pass their own TikTok audit — with public GitHub rejection records (e.g. Postiz #1563: hardcoded default privacy status).

## Gotchas

- TikTok posts published while your app is unaudited are locked SELF_ONLY forever — never let real customers post before the audit passes; it is 'the single most expensive ordering mistake'.
- Your TikTok creator cap is literally the number you type into the audit form's usage estimate — lowballing it caps your growth, and raising it later means contacting TikTok and waiting; estimate 6-12 months ahead.
- TikTok's ~15 posts/day/creator cap is shared across ALL API clients including TikTok's own app — a streamer who also posts manually eats into the same budget (spam_risk_too_many_posts).
- TikTok requires per-post MANUAL privacy selection with no default value — a fully silent auto-publish flow as Winz envisions it conflicts with the audit's UX letter; plan a compliant composer/approval step where the user picks privacy, or expect rejection.
- YouTube's 100 uploads/day default is per PROJECT across all tenants combined, and videos uploaded from an unaudited project are forced private — the audit is required for public uploads at all, not just for more quota.
- Sharding tenants across multiple Google Cloud projects to multiply YouTube quota violates policy III.D.1.c ('exactly one API Project per API client') and risks the entire product's access.
- YouTube audit/extension timelines are unpredictable: officially 'weeks', with 2025-2026 reports of 4+ weeks of silence and one 5-month delay — file well before hitting the ceiling, respond to any ToS Violations Report within its deadline, and use the correct form variant (first audit vs top-up vs appeal) or you're re-queued.
- Kick's default 1,000 event-subscription limit is the real multi-tenant ceiling (verification raises it to 10,000 via developers@kick.com) — and the Developer Agreement requires deleting Kick Data when a streamer disconnects, which includes stored VOD-derived material; Kick can terminate access without notice.
- Blog-sourced numbers (timelines, 2-6 week estimates) are community reports, not SLAs; official docs never commit to review durations on TikTok or YouTube.
- No public postmortems exist from Buffer/Later/Metricool losing TikTok/YouTube access — absence of postmortems is not absence of risk; the single-audited-app architecture means one compliance failure suspends every customer simultaneously.

## Full details

# Multi-tenant platform audits & scale limits for Winz (researched 2026-08-15)

## 1. TikTok Content Posting audit for a multi-tenant SaaS

### Does being a real multi-user product help?
Yes, materially. TikTok's app review guidelines state the app's intended purpose **"cannot be for private/personal use... or development/testing phases"** — the personal/internal-tool rejections are by design. Reviewers approve "content management tools, scheduling platforms, and social media dashboards" with a clear, documented use case. A genuine SaaS with a live marketing site is the profile the audit is built for. The flip side: the review requires a **fully developed public website** (not a landing/login page) with **Privacy Policy and Terms of Service links visible without opening a menu**, and the demo domain must match the website URL you register.

### Two-stage process
1. **Product/scope access** (add Content Posting API + scopes to your app): form-based, typically **days**. Scopes for Winz: `user.info.basic` (mandatory), `video.publish` (direct post), `video.upload` (draft/inbox). **Requesting scopes you don't demonstrably use is a rejection reason.**
2. **Direct Post content audit** (unlocks `PUBLIC_TO_EVERYONE` visibility): separate review of posting behavior, **weeks and variable**.

### Unaudited limits (current, official)
- Max **5 users may post per 24-hour window** per API client.
- All posts forced to **SELF_ONLY**; posting accounts must be **set to private** at post time.
- Posts made while unaudited **stay private permanently** — they cannot be made public retroactively after you pass. (bundle.social: "Plan the sequence so that the audit lands before customer onboarding... the single most expensive ordering mistake.")

### Audit submission contents (from Mixpost's documented walkthrough of the actual form)
- **General info**: describe your org's relationship to TikTok (e.g., "social media management software that allows customers to create, schedule, publish and manage content...").
- **API client info**: App ID; value of Content Posting API to your product; **estimate of daily active posting users** — this number becomes your creator cap (see below). Example format: "X customers × up to 3 TikTok accounts × up to 10 videos/day/account."
- **Supporting documents**: UX mockups (PDF) of the TikTok flow in your product; **one continuous screen recording** of the real app publishing to a real private TikTok test account, narrated/captioned so the reviewer can match each step against the UX guidelines. Restricted (SELF_ONLY) visibility in the demo does not disqualify the recording.
- **Data storage disclosure**: list the API response fields you persist (e.g. `published_id, publicly_available_post_id`).
- **Reviewer access**: live demo URL + credentials + step-by-step guide, or a recording instead.
- General app review also requires **1–5 demo videos, max 50 MB each**, showing the complete end-to-end flow (auth included) of every product/scope requested; custom app name (no social-platform references), clear icon, real description.

### The UX checklist the audit enforces (each is a documented rejection reason)
- Call `creator_info` **before every publish** and render the composer from it ("Skipping this call is an audit failure"); show the creator's **nickname/avatar** so users know which account they're posting to.
- **Privacy status: manual selection from a dropdown with NO default value**, options exactly from `privacy_level_options` (Postiz was rejected verbatim for hardcoding PUBLIC_TO_EVERYONE: "Your application did not follow our UX Guidelines. Point 2)b. Privacy Status...").
- **Comment/Duet/Stitch toggles all unchecked by default**; grey out any the creator disabled ("Turned off in your TikTok account settings" tooltip); Duet/Stitch hidden for photo posts.
- **Commercial content disclosure toggle off by default**; when on, "Your brand" / "Branded content" checkboxes; at least one required to proceed; **branded content cannot be SELF_ONLY** (must show the mutual-exclusion behavior both directions with the warning text).
- **Consent line above the publish button**: "By posting, you agree to TikTok's Music Usage Confirmation" (+ Branded Content Policy when branded).
- Show a **preview** of the post; caption editable; **no promotional watermarks/logos** added to content; enforce `max_video_post_duration_sec` in the UI.

**Design tension for Winz**: TikTok's rules require *per-post, manual, no-default* privacy selection and disclosure settings. A fully hands-off "auto-distribute after stream" flow can't silently pick PUBLIC. Practical pattern used by schedulers: the user configures each post in a compliant composer at scheduling time; for automation, Winz should surface a queue/approval step (or per-clip composer prefilled with *nothing* selected for privacy) rather than invisible auto-publish — expect the audit to probe exactly this.

### Business entity
No legal entity is strictly required to register; TikTok has individual and **Organization** developer accounts. Companies are told to register apps under an organization, and **business verification (docs + certification) is mandatory for monetization** and only doable by org admins. For a SaaS charging subscriptions later, set up the org + verification early.

### Timelines (2025–2026 reports)
- Clean first-pass audit: **~1–2 weeks** (community reports), **5–10 business days** per some 2026 guides.
- Mixpost's docs: TikTok states **2–4 weeks** for review/response; other builders report **2–6 weeks** with feedback rounds. Every rejection re-queues you and adds days–weeks.

### Post-audit scale caps (the key multi-tenant question)
- **24-hour active-creator cap per API client, set from the usage estimate you provided in the audit application form.** Outgrowing it requires contacting TikTok to raise the cap — so estimate generously (project 6–12 months of growth).
- **Per-creator daily post cap ~15 posts/day** (varies by creator), enforced platform-wide and **shared across all API clients** posting to that creator (error: `spam_risk_too_many_posts`). Fine for Winz's use case (a few highlights/day/streamer).
- Cost: the API is free; there is no paid tier.

## 2. YouTube API compliance audit & quota for a multi-tenant uploader

### Quota structure changed in your favor (critical 2025–2026 updates)
- **Dec 4, 2025** (official revision history): video upload cost cut **from ~1,600 to ~100 units**.
- **June 1, 2026**: transition to a **granular quota system** — `videos.insert` and `search.list` now bill to **their own separate daily buckets**.
- **Current defaults per project** (official getting-started page): **100 `videos.insert` calls/day + 100 `search.list` calls/day + 10,000 units/day combined for everything else.** Resets midnight Pacific. Quota is **per project, shared across all tenants** — 100 uploads/day total for all Winz customers until extended.
- **Unaudited-project restriction**: videos uploaded via `videos.insert` from API projects that haven't passed the audit (projects created after July 28, 2020) are **locked to private** — the audit isn't just about quota, it's required for public uploads at all.

### How schedulers get to thousands/day: the Audit & Quota Extension Form
One path only: the **YouTube API Services – Audit and Quota Extension Form** (support.google.com/youtube/contact/yt_api_form). An audit demonstrating ToS compliance is **mandatory before any quota beyond default**; audits within the past 12 months let you request top-ups without a full re-audit. There are separate forms for first audit, top-up, **appeal (after a failed audit)**, and **Change of Control** — submitting the wrong one re-queues you.

**What the form actually asks (field-by-field, from the live form):**
- Organisation vs individual; **legal name, parent company, primary website, full street address**; business category; org size/type; primary/technical/business contacts.
- "Describe your organisation's work as it relates to YouTube" (5,000 chars); target audience; **"How does your API client monetise?"** (subscriptions/freemium/free/ads — Winz: free now, subscription later; answer for the real roadmap); Google/YouTube partner manager contacts; content owner IDs.
- API client name (flagged if it contains "YouTube"), **primary access URL, privacy policy URL, ToS URL**, public accessibility, and **demo account credentials** (login URL + instructions) for reviewers.
- Per project (1–10): **Google Cloud project number**, use-case categories (**"video uploading", "creator tools"** fit Winz), OAuth usage, data-storage acknowledgement, expected volume tier (<1,000 → >10M requests/day).
- **Evidence uploads**: privacy-policy screenshots, homepage screenshot showing the privacy-policy link and YouTube branding compliance, ToS docs, plus **conditional evidence: OAuth consent flow and upload-interface screenshots** for an uploader.
- **Quota details**: endpoint checklist; total/day and peak/min quota requested; **separate quota fields with individual justifications for `search.list` and `videos.insert`**.

**Quota math that gets approved** (bundle.social's guidance): justify with a bottom-up calculation, not round numbers — e.g. *2,000 active channels × 0.3 uploads/channel/day = 600 uploads/day, ×2 verification reads per upload, +20% operational headroom*. For Winz: (paying/active streamers) × (avg clips/day) with `videos.insert` requested in its own bucket, plus a small units budget for status reads/thumbnails.

**What the audit reviews**: how the app represents YouTube content, UI/branding, data handling & retention, privacy disclosures, and whether stated use matches real behavior. ToS obligations that bite an uploader SaaS: **Made for Kids parameter must be set true when applicable** (III.J.2.b.ii); cooperate with monitoring/audits and provide access accounts on request (III.H).

**Timelines (real reports 2025–2026)**: "several weeks" routinely; Google dev forum: compliance review **silent 4+ weeks after remediation** with unanswered follow-ups (2026); YouTube community thread: **quota increase delayed 5 months** (Oct 2025). File the audit long before customer #6.

### Per-project vs per-user strategies
- Quota is **project-scoped, never user-scoped** — per-user OAuth doesn't add quota.
- **Policy III.D.1.c: "you must create exactly one (1) API Project for that API Client."** Sharding tenants across multiple GCP projects to multiply the 100-upload default is a direct policy violation (and a termination risk for the whole product).
- "Bring your own Google Cloud project" per customer effectively makes each customer the developer — this is the self-hosted-software model (Mixpost/Postiz), not viable policy-wise or UX-wise for hosted SaaS. Hosted SaaS = **one audited project + extension requests as you grow**.
- Everything is free — no paid quota tier exists.

## 3. Kick: verified apps & third-party program

- **Setup**: Kick account + **2FA required** for dev tools; create app in Account Settings → Developer tab → ClientID/ClientSecret/redirect URL; OAuth 2.1 (auth at id.kick.com, API at api.kick.com); tokens became refreshable Nov 25, 2025. Agreeing to the **Kick Developer Agreement** is required.
- **App Verification** (from Kick's official dev docs FAQs): "App Verification confirms that an application built on Kick is legitimate and trustworthy." Benefits: **verified badge on the bot account** (anti-impersonation) and **event/chat subscription limits raised from 1,000 → 10,000 subscriptions**. Process: **email developers@kick.com** with Client ID + app name, bot verification needs, **justification (user base size, impersonation concerns, subscription capacity needs)**, and supporting documentation. No formal audit gate like TikTok/YouTube; the 1,000-subscription default is the practical multi-tenant ceiling to plan around (1 sub ≈ 1 event type per channel — request verification before ~hundreds of streamers).
- **Third-party program**: Kick Dev launched a **$100,000 developer fund/bounty program on March 6, 2025** rewarding builders of streamer tools — Winz is squarely the intended profile; worth applying.
- **Developer Agreement constraints relevant to a clip SaaS**: **Kick Data may not be sold, licensed, monetized, or shared with third parties**; no targeting Kick users with off-platform marketing; no transferring data to ad networks/brokers; **must delete all Kick Data upon termination, revocation/reduction of end-user authorization, or upon Kick's or the end user's request**; Kick can terminate at sole discretion with or without notice. Charging streamers a subscription for your tool is a different thing from monetizing Kick Data, but deletion-on-revocation obligations apply to stored VOD-derived material and user data.

## 4. How existing tools structured this

- **Hosted SaaS = one audited app for all customers, universally.** Buffer, Later, Metricool, Hootsuite, Sprout Social, Agorapulse, bundle.social, Ayrshare and Blotato all operate a single developer app per platform; customers OAuth into that app. **Later** was an inaugural **TikTok Content Marketing Partner** badge holder; the 2024–25 Marketing Partner cohort includes Later, Hootsuite, Sprout, Dash Social, Agorapulse, etc. (badging gives Accounts API access and partner support, not different caps). **Blotato** cleared the TikTok audit once and now resells posting via REST/MCP so its customers never touch OAuth app creation — one audited app absorbing all customers' posts, with the app-level creator caps managed internally.
- **Per-customer apps exist only in self-hosted products** (Postiz, Mixpost): each self-hoster must create their own TikTok app and pass their own Direct Post audit. Their public issue trackers are the best available record of what fails: Postiz #1563/#1362 rejections for hardcoded default privacy status, comment-on-by-default, missing creator nickname, unenforced `max_video_post_duration_sec`. This model is not applicable to hosted Winz, but it's the proof that the audit checks the exact UX letter.
- **Public postmortems of losing access**: none of the big four has published a TikTok/YouTube access-loss postmortem. The closest public records of platform risk: (a) Postiz's public TikTok audit rejections; (b) Google dev-forum threads of YouTube compliance reviews going silent 4+ weeks and a 5-month quota-increase delay; (c) **Instagram Basic Display API sunset Dec 4, 2024** and **Meta's Sept 2025 legacy-field deprecation that "caught multiple third-party tools off-guard"**; (d) the 2023 X/Twitter API pricing purge that killed many schedulers' integrations. Structural lesson: the single-audited-app model concentrates risk — one compliance lapse (or a missed ToS-violation-report deadline in YouTube's case) suspends every tenant at once, so treat platform-compliance responses as P0 incidents and keep the composer UX pinned to the audited screens.

## Winz action sequence
1. Register TikTok org developer account + build the compliant composer → pass Direct Post audit **before** onboarding beyond design partners; put a 6–12-month growth number in the daily-creators estimate.
2. Submit the YouTube Audit & Quota Extension Form as soon as the product demo is real (default 100 uploads/day carries roughly the first 30–50 streamers at 2–3 clips/day; the extension lead time is weeks–months).
3. Email developers@kick.com for app verification once webhook subscriptions approach 1,000; apply to the Kick Dev fund.

## Sources

- [TikTok Content Sharing Guidelines (official UX/audit rules, unaudited limits, creator caps)](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [TikTok App Review Guidelines (official — demo video specs, website/policy requirements)](https://developers.tiktok.com/doc/app-review-guidelines/)
- [TikTok Prepare Your Developer Account (individual vs organization, business verification)](https://developers.tiktok.com/doc/perpare-your-developer-account)
- [bundle.social — TikTok API Approval: Audit, Scopes, Rejections](https://bundle.social/blog/tiktok-api-approval)
- [Mixpost docs — TikTok Direct Post Audit (full submission walkthrough, 2-4 week timeline)](https://docs.mixpost.app/services/social/tik-tok/direct-post-audit/)
- [Postiz issue #1563 — TikTok Direct Post audit rejection (verbatim rejection text)](https://github.com/gitroomhq/postiz-app/issues/1563)
- [YouTube Data API — Quota and Compliance Audits (official)](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [YouTube Data API — Getting Started (official default quota: 100 videos.insert, 100 search.list, 10,000 units)](https://developers.google.com/youtube/v3/getting-started)
- [YouTube Data API — Revision History (Dec 4, 2025 upload cost change; June 1, 2026 granular buckets)](https://developers.google.com/youtube/v3/revision_history)
- [YouTube API Services — Developer Policies (III.D.1.c one project per client, III.H audits, III.J Made for Kids)](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube API Services — Audit and Quota Extension Form (live form fields)](https://support.google.com/youtube/contact/yt_api_form?hl=en-GB)
- [bundle.social — YouTube API Quota Exceeded: Limits & Fixes (2026)](https://bundle.social/blog/youtube-api-quota-exceeded-limits-fixes)
- [Google Developer Forums — YouTube API compliance review silent 4+ weeks (2026)](https://discuss.google.dev/t/youtube-api-compliance-review-silent-for-4-weeks-after-remediation-4-unanswered-follow-ups-project-386467719056/388185)
- [YouTube Community — quota increase delay of 5 months (Oct 2025)](https://support.google.com/youtube/thread/381391908/youtube-api-quota-increase-delay-of-5-months?hl=en)
- [KickEngineering/KickDevDocs — official Kick dev docs (app setup, verification FAQ, changelog)](https://github.com/KickEngineering/KickDevDocs)
- [Tubefilter — Kick launches $100,000 API developer fund for third-party streamer tools (Mar 2025)](https://www.tubefilter.com/2025/03/07/kick-launches-api-developer-fund-third-party-streamer-tools/)
- [Kick Developer Agreement (dev.kick.com terms — Kick Data restrictions, deletion obligations)](https://dev.kick.com/terms-and-conditions/)
- [TikTok for Business — Content Marketing Partners program (Later inaugural badge; partner cohort)](https://ads.tiktok.com/business/en-US/blog/introducing-content-marketing-partners)
- [Blotato — Social Media APIs in 2026: A Builder's Guide (one audited app reselling posting; platform deprecation history)](https://www.blotato.com/blog/social-media-api)
- [TimeToPost — How to Post to TikTok With the Content Posting API (2026 audit reality/timelines)](https://timetopost.co/blog/how-to-post-to-tiktok-api/)
- [TokPortal — TikTok Content Posting API developer guide (post caps, 2-6 week reviews)](https://www.tokportal.com/learn/tiktok-content-posting-api-developer-guide)
