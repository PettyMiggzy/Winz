# Research: instagram-api

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Programmatic Reels publishing in Aug 2026 runs through the Instagram Platform API in two flavors: "Instagram API with Instagram Login" (graph.instagram.com, no Facebook Page needed, scopes instagram_business_basic + instagram_business_content_publish) and the legacy "Instagram API with Facebook Login" (graph.facebook.com, Facebook Page link required). The flow is unchanged: create a container (POST /{ig_id}/media with media_type=REELS and a publicly hosted video_url), poll status_code until FINISHED, then POST /{ig_id}/media_publish. For a personal tool serving only your own 4 professional accounts, Standard Access (no App Review, no Business Verification) is sufficient — add each account as an Instagram Tester and have each one OAuth in to get its own 60-day refreshable token. The publish quota is documented as 100 API-published posts per 24-hour moving window on the main page (an older 50 figure still appears elsewhere in the same docs); the authoritative per-account number comes from GET /{ig_id}/content_publishing_limit.

## Key facts

- Flow (unchanged in 2026): POST /{IG_ID}/media with media_type=REELS + video_url -> poll GET /{CONTAINER_ID}?fields=status_code (recommended once per minute, max ~5 minutes) until FINISHED -> POST /{IG_ID}/media_publish with creation_id. Containers expire if not published within 24 hours.
- Two current API paths: 'Instagram API with Instagram Login' (base graph.instagram.com, Instagram User access token, NO Facebook Page required) and 'Instagram API with Facebook Login' (base graph.facebook.com, Facebook User/Page token, Facebook Page link REQUIRED). Instagram Login is the current recommended path for Instagram-only accounts; it lacks hashtag search, product tagging, and partnership-ads features.
- Professional account (Business or Creator) is mandatory on both paths; personal Instagram accounts cannot publish via API at all.
- Permissions: Instagram Login path uses instagram_business_basic + instagram_business_content_publish (old scope names deprecated Jan 27, 2025). Facebook Login path uses instagram_basic + instagram_content_publish + pages_read_engagement.
- No App Review needed for your own accounts: Standard Access (default) covers apps serving accounts you own/manage; Meta's app-review doc explicitly marks App Review 'Not required' for single-business/own-account use. Advanced Access (App Review + Business Verification) is only needed to serve accounts you don't own or manage.
- Publishing quota: main content-publishing doc says 100 API-published posts per 24-hour MOVING period (carousels count as 1); the content_publishing_limit reference page still shows quota_total=50 — docs are internally inconsistent, so check GET /{IG_ID}/content_publishing_limit?fields=quota_usage,config (config returns quota_total and quota_duration=86400).
- API call rate limit (non-messaging): Calls within 24 hours = 4800 x number of impressions of the account's content in the last 24h; usage reported in X-Business-Use-Case-Usage header; throttle error code 80002.
- Reels specs via API: MP4/MOV (moov atom at front, no edit lists), H.264 or HEVC, progressive, closed GOP, 4:2:0; AAC audio max 48 kHz, 128 kbps; 23-60 fps; max width 1920 px; aspect ratio anywhere from 0.01:1 to 10:1 (9:16 recommended to avoid cropping); duration 3 s to 15 min; max file size 300 MB; cover image JPEG only, max 8 MB, sRGB.
- Reels container params: caption (<=2200 chars, 30 hashtags, 20 mentions), cover_url OR thumb_offset (ms), audio_name (original audio only, renameable exactly once), share_to_feed (bool), user_tags, collaborators (max 3), location_id, trial_params (trial reels with graduation_strategy MANUAL or SS_PERFORMANCE).
- A published reel returns media_type=VIDEO; you must check media_product_type=REELS to identify it.
- Multiple accounts: each of the 4 professional accounts completes Business Login separately and gets its own app-scoped Instagram User token (short-lived -> long-lived via graph.instagram.com/access_token?grant_type=ig_exchange_token, valid 60 days, refresh via graph.instagram.com/refresh_access_token when >=24h old). No documented hard cap that would block 4 tester accounts on one app; the 100 (or 50)/24h publish quota is per IG account, not per app.
- video_url must be on a publicly accessible server at the time Meta fetches it; resumable upload (local file upload via rupload.facebook.com/ig-api-upload/{version}/{container_id} with Authorization: OAuth header and offset/file_size or file_url) is available ONLY to apps using Facebook Login for Business — Instagram Login apps must use public video_url hosting.
- Current Graph API version in Meta's own examples as of Aug 2026 is v25.0; Basic Display API has been dead since Dec 4, 2024 — ignore any tutorial referencing it.

## Gotchas

- Meta's own docs currently contradict themselves on the publish quota (100/24h on the Content Publishing page vs 50/24h on the content_publishing_limit reference and a Limitations bullet). Query GET /{IG_ID}/content_publishing_limit and trust config.quota_total for your account; the window is moving (each publish frees capacity 24h later), not midnight-reset.
- Resumable upload (rupload.facebook.com) is ONLY for Facebook Login for Business apps — on the Instagram Login path you cannot upload local files and must serve a public video_url.
- Old permission names (instagram_graph_user_profile etc. and pre-2025 Instagram Login scopes) were deprecated Jan 27, 2025; Basic Display API was shut down Dec 4, 2024 — many tutorials and Stack Overflow answers are stale.
- Personal (non-professional) Instagram accounts cannot publish via API under any path; each account must be switched to Business or Creator.
- video_url fetch failures are the top failure mode: redirect-y share links (Google Drive/Dropbox), wrong Content-Type, or URLs that expire before processing produce ERROR/EXPIRED containers with vague error codes. Host direct MP4 URLs and keep them alive until status_code=FINISHED.
- Containers expire after 24 hours if unpublished; publishing a container that isn't FINISHED yet returns an error — poll (once/minute, ≤5 min recommended; long videos can need longer) before calling media_publish.
- The BUC call quota is 4800 x impressions in the last 24h — an account with almost no reach has a tiny API call budget, so aggressive status polling on a new account can hit error 80002.
- audio_name can be set only for original audio and renamed exactly once; cover images must be JPEG (no PNG, no MPO/JPS); reels cannot be included in carousels.
- Published reels return media_type=VIDEO — filter on media_product_type=REELS instead.
- Long-lived tokens silently expire at 60 days unless refreshed (refresh requires the token to be ≥24h old and still valid); password changes or removing the app invalidate tokens immediately — build automated refresh for all 4 accounts.
- Going beyond own/managed accounts (any third-party user) flips you to Advanced Access: full App Review with per-permission screencasts plus Business Verification — significant effort and typically days-to-weeks of review; avoid entirely by keeping accounts as app role-holders (Instagram Testers).
- Docs URLs are migrating from developers.facebook.com/docs/... to developers.facebook.com/documentation/... in 2026; both currently resolve but links in older material may break.

## Full details

## 1. Current publishing flow (Aug 2026)

The three-step container flow is still the only way to publish Reels programmatically (Meta "Content Publishing" guide, examples shown on v25.0):

1. **Create container**
   `POST https://graph.instagram.com/v25.0/{IG_ID}/media` (Instagram Login) or `POST https://graph.facebook.com/v25.0/{IG_USER_ID}/media` (Facebook Login)
   Body: `media_type=REELS`, `video_url=https://.../video.mp4`, plus optional params (below), `access_token=...`
   Returns `{ "id": "<IG_CONTAINER_ID>" }`.
2. **Poll status**
   `GET /{IG_CONTAINER_ID}?fields=status_code` — values: `IN_PROGRESS`, `FINISHED` (ready to publish), `ERROR`, `EXPIRED` (not published within 24 h), `PUBLISHED`. Meta's recommendation: "query a container's status once per minute, for no more than 5 minutes." Long Reels can legitimately take several minutes to process.
3. **Publish**
   `POST /{IG_ID}/media_publish` with `creation_id=<IG_CONTAINER_ID>`. Returns the IG Media ID.

Note: after publishing, the reel's `media_type` field returns `VIDEO`; use `media_product_type` (= `REELS`) to distinguish reels.

## 2. Instagram Login vs Facebook Login; account requirements

- **Instagram API with Instagram Login** (launched July 2024, now the primary path for Instagram-only workflows):
  - Base URL `graph.instagram.com`; OAuth at `https://www.instagram.com/oauth/authorize`; token exchange at `api.instagram.com/oauth/access_token`.
  - **No Facebook Page required** — Meta's docs state this setup "does not require a Facebook Page to be linked".
  - Scopes: `instagram_business_basic`, `instagram_business_content_publish` (plus `instagram_business_manage_comments` / `instagram_business_manage_messages` if needed). The pre-2025 scope names were deprecated **Jan 27, 2025**.
  - Missing vs Facebook Login: hashtag search, product tagging, partnership ads/boosting, Business Manager integration.
- **Instagram API with Facebook Login** (legacy/full-featured): base `graph.facebook.com`, requires the IG professional account to be linked to a Facebook Page; permissions `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (or `pages_show_list`); token is a Facebook User/Page token and one Facebook user can enumerate multiple Pages -> multiple IG accounts.
- **Both paths require a professional (Business or Creator) Instagram account.** Personal accounts are excluded entirely.
- The now-dead **Basic Display API** (shut down Dec 4, 2024) never supported publishing; disregard older tutorials.

## 3. App Review, Standard vs Advanced Access, personal-use tools

- **Standard Access** (default from the moment the app is created): full API functionality for **accounts you own/manage** — i.e., accounts with a role on the app. Meta's Instagram-platform app-review page marks App Review as **"Not required"** for this case.
- **Advanced Access**: needed only if the app serves IG professional accounts **you don't own or manage** (i.e., you're a Tech Provider / SaaS). Requires full Meta App Review (screencast of the end-to-end flow per permission, testing instructions, privacy policy, app icon, category, business email) **plus Business Verification**.
- **Practical recipe for a personal 4-account tool**: create an app with the "Instagram" use case ("API setup with Instagram business login"), keep it in Development mode / Standard Access, add each of the 4 professional accounts as an **Instagram Tester** (App Dashboard -> Roles -> Instagram Testers; each account must accept the invite in Instagram Settings -> Website permissions / Apps and Websites -> Tester invites), then run Business Login once per account to mint tokens. **Publishing to those accounts works with zero App Review** — posts published this way are real, public posts; Development mode restricts who can authorize the app, not what it can publish for authorized role-holding accounts.

## 4. Rate limits

- **Content publishing quota (per IG account, enforced at `media_publish`)**: the main Content Publishing doc says **"100 API-published posts within a 24-hour moving period"** and "Carousels count as a single post." However, the `content_publishing_limit` reference page and one Limitations bullet still say **50** — Meta's docs currently contradict themselves (the limit was 25 originally, then 50, with 100 appearing in 2025-era doc revisions). It is a *moving* window: capacity frees 24 h after each publish.
  - Check programmatically: `GET /{IG_ID}/content_publishing_limit?fields=quota_usage,config` -> `quota_usage` (containers published since `since`) and `config { quota_total, quota_duration: 86400 }`. Treat whatever `quota_total` returns for your account as truth.
- **General API call limit (Platform/BUC)**: `Calls within 24 hours = 4800 × Number of Impressions` (impressions = times the account's content entered someone's screen in the last 24 h). Monitored via the `X-Business-Use-Case-Usage` response header (`call_count`, `total_cputime`, `total_time`, `estimated_time_to_regain_access`); throttle error code **80002**. A brand-new account with near-zero impressions has a very small call budget — poll status sparingly.

## 5. Reels video specs & params (from the IG User Media reference)

| Spec | Requirement |
|---|---|
| Container | MP4 (MPEG-4 Part 14) or MOV; moov atom at front; no edit lists |
| Video codec | H.264 or HEVC; progressive scan; closed GOP; 4:2:0 chroma |
| Audio codec | AAC, ≤48 kHz, mono/stereo, ≤128 kbps |
| Frame rate | 23–60 fps |
| Resolution | max width 1920 px |
| Aspect ratio | 0.01:1 – 10:1 accepted; **9:16 recommended** (else cropped/letterboxed) |
| Bitrate | VBR, ≤25 Mbps |
| Duration | 3 s – 15 min |
| File size | ≤300 MB |
| Cover (`cover_url`) | JPEG only, ≤8 MB, sRGB; 9:16 recommended |

Container params: `caption` (≤2200 chars, ≤30 hashtags, ≤20 @mentions), `cover_url` **or** `thumb_offset` (ms into video, default 0), `audio_name` (only for **original audio**; renameable exactly once), `share_to_feed=true|false` (true -> appears in Feed *and* Reels tab; false -> Reels tab only), `user_tags` (JSON array; username required), `collaborators` (≤3 usernames; invites respect privacy), `location_id` (Facebook Page ID of a place), `trial_params={"graduation_strategy":"MANUAL"|"SS_PERFORMANCE"}` for Trial Reels. Reels cannot appear inside carousels. Account privacy settings are enforced at publish time.

## 6. Multiple accounts under one app

- Each professional account performs Business Login and gets its **own app-scoped Instagram User token**. Store 4 tokens; the publish quota is per account, and the BUC call quota is computed per account too.
- Token lifecycle: short-lived (1 h) -> exchange `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=...` -> **long-lived, 60 days** -> refresh `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` (token must be ≥24 h old; unrefreshed tokens die at 60 days; password change/logout can invalidate early). Automate a refresh job.
- No documented cap that would block 4 Instagram Tester accounts on one app; tester-count limits aren't published, but small numbers (single digits) are routine.
- Alternative: the Facebook Login path lets one Facebook user token fan out to every Page-linked IG account (`GET /me/accounts` -> `?fields=instagram_business_account`), at the cost of requiring Facebook Pages.

## 7. video_url hosting & resumable upload

- `video_url`/`image_url`/`cover_url` **must be publicly reachable at fetch time** — Meta's servers download the file ("the media must be hosted on a publicly accessible server at the time of the attempt"). Keep the URL alive until status is `FINISHED`. Time-limited presigned URLs (S3/GCS/R2) work if the expiry comfortably covers the fetch; direct file URLs with correct Content-Type/Content-Length are needed (Google Drive/Dropbox share-page links commonly fail — community-reported, not in official docs).
- **Resumable upload alternative** (local file, no public hosting): create container with `upload_type=resumable` (no `video_url`), then `POST https://rupload.facebook.com/ig-api-upload/{API_VERSION}/{IG_CONTAINER_ID}` with headers `Authorization: OAuth <token>`, `offset: 0`, and either `file_size: <bytes>` (raw binary body) or `file_url: <public url>`. Success returns `{"success":true,"message":"Upload successful."}`. **Available only to apps using Facebook Login for Business** — the Instagram Login path has no resumable option, so an Instagram-Login tool must host videos on a public URL (a tiny S3 bucket with presigned GETs is the standard workaround).

## 8. Cost

The Instagram Platform API is free; there is no paid tier for publishing. Costs are only your hosting for `video_url`.

## Sources

- [Publish Content using the Instagram Platform (Meta official)](https://developers.facebook.com/docs/instagram-platform/content-publishing)
- [IG User Media reference — container params & Reels specs (Meta official)](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media)
- [IG User content_publishing_limit reference (Meta official)](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit)
- [Instagram Platform Overview — login types, access levels, rate limits (Meta official)](https://developers.facebook.com/docs/instagram-platform/overview)
- [Instagram API with Instagram Login (Meta official)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login)
- [Business Login for Instagram — OAuth & token exchange (Meta official)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Instagram Platform App Review (Meta official)](https://developers.facebook.com/docs/instagram-platform/app-review)
- [Graph API Rate Limiting — BUC limits (Meta official)](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
- [Instagram API in 2026: every option explained (Zernio)](https://zernio.com/blog/instagram-api)
- [Post to Instagram via API: Guide 2026 (Postproxy)](https://postproxy.dev/blog/post-to-instagram-via-api/)
- [Instagram Platform API with Instagram Direct Login implementation guide (GitHub gist)](https://gist.github.com/PrenSJ2/0213e60e834e66b7e09f7f93999163fc)
- [Instagram Graph API: Complete Developer Guide for 2026 (Elfsight)](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
