# Research: youtube-api

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Programmatic Shorts uploading got dramatically cheaper in 2025-2026: the videos.insert quota cost dropped from ~1,600 units to ~100 units on Dec 4, 2025, and on June 1, 2026 Google moved uploads into their own granular quota bucket — default projects now get 100 uploads/day (vs ~6/day in the old system) plus 100 search.list calls/day and 10,000 units/day for everything else. The critical blocker is unchanged: any video uploaded via an unverified API project (created after July 28, 2020) is locked private with no appeal, and lifting this requires passing the YouTube API compliance audit (weeks to months). Shorts are auto-classified (≤3 min, square-or-taller aspect ratio; no API field, no #Shorts hashtag required), one API project can legitimately serve OAuth tokens for 4 brand channels under one Google account, and YouTube explicitly confirmed the July 15, 2025 "inauthentic content" rename does not affect clip channels — but a Feb 1, 2027 change will require 10M qualified Shorts views/90 days per channel to earn Shorts ad revenue, which is a major threat to a 4-way-split clip operation.

## Key facts

- videos.insert quota cost: was ~1,600 units until Dec 4, 2025, when Google cut it to ~100 units; since June 1, 2026 it costs 1 unit in its own dedicated 'Video Uploads' bucket capped at 100 calls/day (official docs, fetched 2026-08-15)
- Default quota allocation in 2026: 100 videos.insert calls/day + 100 search.list calls/day + 10,000 units/day combined for all other endpoints, per Google Cloud project, resetting at midnight Pacific Time — so 100 uploads/day by default (up from ~6/day pre-Dec-2025)
- Locked-private issue is STILL ACTIVE in Aug 2026: official videos.insert docs state 'All videos uploaded via the videos.insert endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode' — and locked videos CANNOT be appealed, only re-uploaded via a verified service or the YouTube app/site
- Fix for private-locking and for quota increases is the same YouTube API Services Audit & Quota Extension Form (support.google.com/youtube/contact/yt_api_form); no guaranteed timeline — reports range from 2-4 weeks to 5 months, with denials for vague use cases, missing privacy policies, or scraper-like behavior
- Separate from the YouTube audit: Google OAuth consent-screen verification — youtube.upload is a sensitive scope; apps left in 'Testing' status cap at 100 test users and refresh tokens expire every 7 days; Production status makes refresh tokens long-lived
- A Short in 2026 = video up to 3 minutes (raised from 60s on Oct 15, 2024) with height >= width (9:16 recommended, 1:1 accepted), max 1080p; classification is fully automatic — there is NO Shorts-specific field in videos.insert, no isShort field in API responses, and #Shorts hashtag is NOT required (at most a weak discovery signal)
- Custom thumbnails cannot be set on Shorts (thumbnails.set is ignored/unsupported for them); Shorts view counting changed March 26, 2025 to count every play/replay with no minimum watch time ('engaged views' still gate monetization)
- Multi-channel: one Google account can own multiple brand-account channels (create at youtube.com/channels); OAuth consent flow lets you pick the brand channel on a second screen, yielding one refresh token per channel; one API project serving 4 channels' tokens is normal and allowed — quota is pooled per-project (100 uploads/day across all 4)
- Creating multiple Cloud projects to multiply quota for the same use case violates YouTube Developer Policies (quota-evasion) and risks API termination — get a quota extension instead
- July 15, 2025 policy change: 'repetitious content' was merely RENAMED 'inauthentic content' (mass-produced/repetitive content was already unmonetizable); YouTube explicitly stated the reused-content policy is unchanged and clip/reaction/compilation channels with added original value are unaffected — clips of YOUR OWN streams are not 'reused content' (that policy covers content borrowed from others)
- YPP 2026 thresholds: full monetization = 1,000 subs + (4,000 public watch hours/12mo OR 10M public Shorts views/90 days); fan-funding tier = 500 subs + 3 uploads/90 days + (3,000 watch hours OR 3M Shorts views)
- Announced Aug 10, 2026, effective Feb 1, 2027: YPP admission rises to 1,000 subs + (8,000 watch hours/365 days OR 20M Shorts views/90 days), AND all members — including existing/grandfathered ones — need >=10M qualified Shorts views per rolling 90 days to receive Shorts ad revenue (ads suspended below that line)

## Gotchas

- The private-lock is not deprecated folklore — the warning is live on the official videos.insert docs as of Aug 15, 2026, and locked videos have NO appeal path; you must pass the API audit BEFORE public uploads work, and re-upload anything locked
- Two separate verification gates are easily confused: Google OAuth consent verification (fixes 7-day refresh-token expiry + 100-test-user cap) and the YouTube API compliance audit (fixes private-locking + enables quota extensions) — passing one does not satisfy the other
- Audit timeline is unpredictable: officially 'as soon as possible', in practice weeks to months (documented 5-month case); vague use cases, missing privacy policy, or scraper-looking automation get denied
- Many 2025-2026 blog posts still quote the obsolete 1,600-unit upload cost / ~6 uploads per day; the official numbers since June 1, 2026 are 100 uploads/day in a dedicated bucket — always check developers.google.com/youtube/v3/determine_quota_cost
- There is no API field to force Short classification: a 3:01 video or one even slightly wider than tall silently publishes as a regular video with no warning; validate duration and aspect ratio before upload
- Custom thumbnails don't work on Shorts via thumbnails.set
- Quota is per Google Cloud project and pooled across all 4 channels' tokens; creating multiple projects to multiply quota violates YouTube Developer Policies and risks API access termination
- Channel-level upload caps (uploadLimitExceeded) exist independently of API quota and are unpublished
- publishAt scheduling requires the upload to be privacyStatus=private initially, and status.selfDeclaredMadeForKids must be set explicitly or uploads may be flagged for review
- Misleading/unrelated tags and descriptions are an explicitly stated trigger for videos being locked private again even on verified projects
- Posting identical clips across all 4 channels risks the 'inauthentic content' (mass-produced/repetitive) monetization policy even though clips of your own streams are otherwise fine — differentiate edits per channel
- Feb 1, 2027 cliff: every channel individually needs >=10M qualified Shorts views per rolling 90 days to receive Shorts ad revenue (even existing YPP members), and new-member admission rises to 20M Shorts views or 8,000 watch hours — a 4-way view split makes each channel harder to monetize
- Shorts 'views' since March 26, 2025 count every play with no minimum watch time, but YPP eligibility uses stricter 'engaged views' — public view counts overstate monetization progress

## Full details

## 1. Quota: videos.insert cost and daily upload capacity (2026 state)

The premise in the question ("1600 units, 10,000/day, ~6 uploads/day") is **outdated by two major changes**:

- **Dec 4, 2025** (official revision history): "a change in the quota cost of a video upload from approximately 1600 units to approximately 100 units." Docs and the Quota Calculator were updated.
- **June 1, 2026** (official revision history): transition to a **granular quota system** — "API calls to the `videos.insert` and `search.list` methods will be charged to their own respective quota buckets."

**Current default allocation (verified on developers.google.com/youtube/v3/determine_quota_cost and guides/quota_and_compliance_audits, fetched 2026-08-15):**

> "Projects that enable the YouTube Data API have a default quota allocation of 100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units per day combined for all other endpoints."

- `videos.insert`: **1 unit per call in its own "Video Uploads" bucket, 100 calls/day** → **100 uploads/day by default, per Google Cloud project** (not per channel). Resets midnight Pacific.
- Uploads no longer compete with reads/searches for budget. Other costs (shared 10,000-unit pool): `videos.list` 1, `videos.update` 50, `playlistItems.insert` 50, `thumbnails.set` 50, `captions.*` ~50. New `videos.batchGetStats` (June 3, 2026) costs 1 unit in its own bucket.
- Max upload file size: 256 GB; MIME `video/*` or `application/octet-stream`. Resumable upload protocol supported.

**Practical math for 4 Shorts channels on one project:** 100 uploads/day pooled = e.g. 25 Shorts/day/channel — far more than any sane Shorts cadence, so the default quota is no longer the bottleneck.

**Quota increase / audit process:**
- Any extension beyond default requires first passing a **compliance audit** against the YouTube API Services Terms of Service, via the **"YouTube API Services – Audit and Quota Extension Form"** (`support.google.com/youtube/contact/yt_api_form`). Related forms: Appeals form (failed audits), Periodic audit form, Change-of-Control form.
- Google's only stated SLA: "A member of YouTube's API Services team will contact you as soon as possible." Community-reported reality: **a few weeks is typical, 2–4 weeks commonly cited, with documented outliers up to 5 months**; approvals sometimes come in below the requested amount (modest bumps like 50k–100k units) or are denied.
- Common denial causes reported by developers: vague use case description, no public privacy policy, automation resembling scraping/bulk-download, unclear data handling.

## 2. The locked-as-private problem — current state (verified Aug 2026)

**Still fully in force.** The official `videos.insert` reference page (fetched 2026-08-15) still carries the warning:

> "All videos uploaded via the `videos.insert` endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode."

Official "Videos locked as private" help page (support.google.com/youtube/answer/7300965):
- "For videos that have been locked as private due to upload via an unverified API service, **you will not be able to appeal**."
- Remedies: re-upload via a verified API service or via the YouTube app/site; the API service (your project) can "apply for an API audit."

**Key operational facts:**
- The lock is **per API project**, not per channel or per Google account. A brand-new Cloud project in 2026 uploading public Shorts will have every one of them flipped to private (typically shortly after upload, sometimes with a "Terms of Use violation / spam" style notice).
- The fix is the **same Audit & Quota Extension Form** — you can submit it specifically to satisfy the video-upload audit even if you don't need more quota. Until it's approved, treat the project as private-upload-only.
- This is **separate from Google OAuth app verification** (Cloud Console consent screen). Two independent gates:
  1. **OAuth consent verification** (Google Trust & Safety): `https://www.googleapis.com/auth/youtube.upload` is a *sensitive scope*. In "Testing" publishing status you're capped at 100 test users and **refresh tokens expire after 7 days** — automation breaks weekly. Moving to "Production" with verification (demo video of the OAuth flow, privacy policy, homepage) makes refresh tokens long-lived.
  2. **YouTube API compliance audit** (YouTube API Services team): lifts the private-lock and enables quota extensions.
- For a personal/internal tool: if your Google account is in a Workspace org you can mark the app "Internal" and skip OAuth verification, but the **YouTube audit for public uploads is still required regardless**. Plan 2–4+ weeks before launch.

## 3. Shorts specifics in 2026

**What makes an upload a Short (auto-classification, no opt-in):**
- Duration **up to 3 minutes** (raised from 60s for uploads after Oct 15, 2024 — confirmed by official help: "short-form videos that are up to 3 minutes long"). 3:01 silently becomes a regular video.
- Aspect ratio: **square or taller** (height ≥ width). 9:16 / 1080×1920 recommended; 1:1 accepted. Anything wider than square = regular upload.
- Max playback resolution for Shorts: 1080p.

**API mechanics:**
- **There is no Shorts-specific field or parameter in `videos.insert`** — you upload exactly like a normal video and YouTube's backend classifies it. There is no way to force or prevent Short classification other than the duration/aspect properties of the file itself.
- **#Shorts hashtag is NOT required** and does not control classification; at most a weak discovery/intent signal. (Some 2026 guides still recommend adding it to title/description; harmless.)
- **No `isShort` field exists in any API response** (long-standing open issue, issuetracker.google.com/issues/232112727). Detection workarounds: HEAD request to `youtube.com/shorts/{videoId}` (200 = Short, redirect = not), or heuristics on `contentDetails.duration` + file aspect ratio.
- **Custom thumbnails: not supported for Shorts** (thumbnails.set won't give a Short a custom thumbnail; frame selection is app-only).
- Relevant settable fields for a Shorts pipeline: `snippet.title/description/tags/categoryId`, `status.privacyStatus`, `status.publishAt` (requires `privacyStatus=private` at upload), `status.selfDeclaredMadeForKids` (set explicitly), `status.containsSyntheticMedia` (added Oct 30, 2024 — disclose altered/synthetic/AI content), `status.license`, `notifySubscribers` query param.
- **March 26, 2025** (official revision history): Shorts view counting changed — a "view" now counts every start/replay with **no minimum watch time**; monetization/YPP eligibility still uses the stricter "engaged views."
- June 3, 2026: new `videos.batchGetStats` method (1 unit, own bucket) — cheap stats polling for many Shorts at once.

## 4. Multi-channel setup (4 Shorts channels)

- **Brand channels under one Google account: yes.** Create additional channels at `youtube.com/channels` — each is a Brand Account channel owned by your Google identity. Brand accounts support Owner / Manager / Communications Manager roles, so collaborators can be added without sharing the Google password.
- **One OAuth token per channel: yes, required.** Channel identity is baked into the token at consent time: the OAuth flow shows the Google account chooser first, then a **second screen listing the brand channels** — pick the channel, get an authorization code, exchange for a **refresh token bound to that channel**. Run the flow 4 times → 4 refresh tokens. Store them keyed by channel.
- **One API project serving 4 channels' tokens: allowed and normal.** This is exactly the standard multi-user app pattern; nothing in the API Services ToS restricts the number of channels a client serves. All 4 channels **share the project's quota** (100 uploads/day bucket).
- **`onBehalfOfContentOwner` is NOT for you** — it's only for YouTube CMS content partners (MCNs) with a content-owner account.
- **Do NOT spin up 4 separate Cloud projects to multiply quota.** YouTube Developer Policies prohibit creating additional projects to circumvent quota; it's grounds for termination of API access. (Some 2026 blog posts suggest it; it's a compliance risk — with the 2026 granular buckets you don't need it anyway.)
- Note there are also **channel-level upload limits** independent of API quota (the `uploadLimitExceeded` error); YouTube doesn't publish the numbers, but very high daily upload counts per channel can hit them.
- Audit tip: one project = one audit covering all 4 channels. Describe the use case as "first-party tool uploading our own original content to channels we own" — first-party/own-content tools are the easiest audit category.

## 5. Monetization and policy for streamer-clip Shorts channels

**"Inauthentic content" update (July 15, 2025):**
- YouTube **renamed** its "repetitious content" YPP policy to "**inauthentic content**", clarifying it covers content that is "repetitive or mass-produced." YouTube (via creator liaison Rene Ritchie) called it a "minor update" — such content was *already* ineligible for monetization.
- **Explicitly no change to the reused content policy**: commentary, clips, compilations and reaction videos remain monetizable **if significant original value is added**.
- **Clips of YOUR OWN content:** the reused-content policy targets content borrowed from *others* without transformation. Clipping your own streams onto your own Shorts channels is not "reused content" in the policy sense — this is a well-established, monetized format (official streamer clip channels). Risk vector is instead the *inauthentic content* side: **mass-produced, near-identical uploads** (e.g., the same clip pushed to all 4 channels, or template-identical output at volume) can be judged repetitive/mass-produced. Mitigate with per-channel differentiation: distinct editing, captions/hook text, framing, channel themes.
- Also stay clean on metadata: misleading tags/descriptions are a stated trigger for private-locking/spam flags on API uploads.

**YPP requirements (current, 2026):**
- Full monetization (ads + everything): **1,000 subscribers + (4,000 public watch hours in 12 months OR 10M public Shorts views in 90 days)**.
- Fan-funding tier (Super Thanks/Chat, memberships, shopping): **500 subscribers + 3 public uploads in 90 days + (3,000 watch hours OR 3M Shorts views)**.
- Shorts ad revenue uses the pooled revenue-share model (45% creator share of the allocated creator pool); RPMs are low — clip channels live on volume.

**Announced Aug 10, 2026 — effective Feb 1, 2027 (highly relevant to a 4-channel plan):**
- YPP **admission** thresholds rise to **1,000 subs + (8,000 qualified watch hours/365 days OR 20M qualified Shorts views/90 days)**.
- **All YPP members** — including existing, grandfathered ones — will need **≥10M qualified Shorts views in a rolling 90-day window** to receive Shorts ad/subscription revenue; fall below and Shorts ads are suspended until you recover. Fan-funding tier (500 subs) is unchanged.
- Strategic implication: splitting one content stream across 4 channels divides views 4 ways, and **each** channel independently needs 10M/90d for Shorts ad money after Feb 2027. Concentrating on 1–2 channels (or using the other channels for niche/language splits with fan-funding-only expectations) may be the better monetization structure.

## Suggested rollout checklist
1. Create the Cloud project now; enable YouTube Data API v3; consent screen → External; add `youtube.upload` scope.
2. Immediately submit **both** OAuth verification (to escape 7-day refresh-token expiry) and the **YouTube Audit & Quota Extension Form** (to escape private-locking) — budget 2–6+ weeks.
3. Meanwhile build against private uploads (`privacyStatus=private`) — the lock is invisible in testing since your uploads are private anyway.
4. Mint 4 refresh tokens (one OAuth dance per brand channel), store per-channel.
5. Encode 1080×1920, ≤3:00 (aim ≤2:59), set `selfDeclaredMadeForKids=false`, `containsSyntheticMedia` if applicable, use `publishAt` for scheduling.
6. Do not exceed 100 uploads/day/project; do not clone projects for quota.

## Sources

- [YouTube Data API — Quota Calculator / determine_quota_cost (official)](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube Data API — Revision History (Dec 4 2025 quota cut; June 1 2026 granular buckets; Mar 26 2025 Shorts views)](https://developers.google.com/youtube/v3/revision_history)
- [YouTube Data API — Videos: insert reference (unverified-project private-lock warning, request body, limits)](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube Data API — Quota and Compliance Audits (official)](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)
- [YouTube API Services — Audit and Quota Extension Form](https://support.google.com/youtube/contact/yt_api_form)
- [YouTube Help — Videos locked as private (no appeal for unverified API uploads)](https://support.google.com/youtube/answer/7300965?hl=en)
- [YouTube Help — Get started creating Shorts (up to 3 minutes)](https://support.google.com/youtube/answer/10059070?hl=en)
- [YouTube Help — Channel monetization policies (inauthentic content)](https://support.google.com/youtube/answer/1311392?hl=en)
- [Postproxy — YouTube Upload API: Videos & Shorts (2026)](https://postproxy.dev/blog/youtube-upload-api-guide/)
- [Tubefilter — YouTube stricter ad eligibility for Shorts (Aug 10, 2026, effective Feb 1, 2027)](https://www.tubefilter.com/2026/08/10/youtube-partner-program-ad-eligibility-requirements-shorts/)
- [NewscastStudio — YouTube tightens Partner Program requirements for 2027](https://www.newscaststudio.com/2026/08/10/youtube-partner-program-monetization-changes-2027/)
- [vidIQ — YouTube Shorts monetization 2026 (10M/3M view tiers)](https://vidiq.com/blog/post/youtube-shorts-monetization/)
- [vidIQ — YouTube Reused Content Policy: staying monetized in 2026](https://vidiq.com/blog/post/youtube-reused-content-policy-guide/)
- [singhamandeep.com — YouTube API quota increase: how the audit works (2026)](https://singhamandeep.com/youtube-data-api-quota-increase-audit/)
- [Google Issue Tracker — Identifying if a video is a Short via the API (no isShort field)](https://issuetracker.google.com/issues/232112727)
- [Unipile — Google OAuth refresh token: 7-day testing-mode expiration (2026)](https://www.unipile.com/google-oauth-refresh-token/)
- [GitHub gist — Authenticating YouTube API with a Brand Account (channel picker in OAuth flow)](https://gist.github.com/veuncent/e0b831ab41d598961d2656c7fc5cc0f9)
- [iMusician — YouTube targets inauthentic content with policy changes (July 2025)](https://imusician.pro/en/resources/blog/youtube-updates-its-monetization-policies)
