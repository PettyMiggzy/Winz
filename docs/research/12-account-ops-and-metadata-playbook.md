# Research: account-ops-and-metadata-playbook

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Platform APIs do not down-rank posts for being API-published (Mosseri statement; Hootsuite's 2025 experiment showed scheduled posts outperforming native), but each platform gates new automated accounts hard: TikTok's Content Posting API keeps every post SELF_ONLY until your app passes a separate audit and caps creators at ~15 API posts/day (6 req/min); unverified YouTube API projects get uploads locked private until a compliance audit; Instagram allows 100 API posts per 24h but new professional accounts need 2-4 weeks of manual warm-up to avoid action blocks. The winning launch pattern is: create/verify accounts on residential IPs and real devices (staggered, never same-day), warm up manually for 1-2 weeks with native posting, then ramp API posting from 1/day to steady state 2-3/day with jittered timestamps. For metadata, the levers are keyword-first captions (first 80 chars on TikTok, title first 5-7 words on Shorts), 2-5 specific hashtags, and transcript-grounded hooks — while accepting hard API constraints: no trending sounds via TikTok API, no Instagram music library via API, no custom Shorts thumbnails, and mandatory AI-content labeling (is_aigc) where content is synthetic.

## Key facts

- TikTok Content Posting API: unaudited clients can ONLY post SELF_ONLY (private) content, max 5 users per 24h, and all accounts must be private at posting time; a separate app audit is required for public posting (developers.tiktok.com, current as of Aug 2026).
- TikTok API hard limits: 6 requests/minute per user access_token; per-creator daily cap of ~15 API posts/day shared across ALL API clients; exceeding triggers spam_risk_too_many_posts; title/caption max 2,200 UTF-16 chars; line breaks stripped (Ayrshare docs).
- TikTok direct-post fields: privacy_level (must match /creator_info/query options), disable_duet/stitch/comment, video_cover_timestamp_ms (cover frame), brand_content_toggle, brand_organic_toggle, is_aigc (AI-generated label). No parameter exists to attach TikTok library/trending sounds via API.
- Instagram Graph API: 100 API-published posts per 24h moving window (carousel = 1 post); check real quota via GET /{ig-user-id}/content_publishing_limit; professional account required; JPEG only for images; Reels audio_name can be set once; Instagram music library cannot be attached via API — audio must be baked into the video file.
- YouTube Data API: videos.insert quota cost cut from ~1,600 to ~100 units on Dec 4, 2025 (official revision history) — default 10,000 units/day project quota now allows ~100 uploads/day; unverified API projects created after Jul 28, 2020 have ALL uploads locked private until the project passes YouTube's API compliance audit.
- Custom thumbnails are not supported for YouTube Shorts via API (thumbnails.set applies only to regular videos); workarounds: bake a designed frame into the video and select it in Studio, or use the desktop Studio custom-thumbnail option that rolled out during 2025. Thumbnail is locked after publish.
- API-published vs native: no documented ranking penalty on any of the three platforms; Adam Mosseri has stated scheduled posts don't get lower reach; Hootsuite's 2025 controlled test found scheduled posts outperformed native (8.19% vs 6.44% engagement); Meta/TikTok/Google all confirm the publishing surface is invisible to ranking.
- Warm-up consensus (practitioner, 2025-2026): TikTok 7-14 days of native-app activity before automated posting; Instagram 2-4 weeks progressive (order: profile → scroll → follow → like → story → comment → post), first posts manual; YouTube: phone-verify immediately, complete intermediate/advanced feature verification (raises daily upload limits), expect lower unpublished upload caps on new channels.
- Datacenter IP risk is real for account creation and session-based automation (TikTok explicitly scores hosting ASNs like Hetzner/OVH/AWS as high risk; 'IP + device fingerprint + behavior model = risk score'), but server-to-server official API calls from cloud IPs are normal (Buffer/Hootsuite/Later all post from cloud) — create accounts and complete OAuth grants from residential IPs/real devices, then post via API from anywhere.
- TikTok Originality Policy (enforced since Sep 15, 2025) demotes visible third-party watermarks and near-duplicate uploads; YouTube renamed 'repetitious content' to 'inauthentic content' (Jul 15, 2025) — mass-produced/templated AI content is ineligible for monetization; clip channels need transformative editing and documented rights to source content.
- Hashtags 2026: TikTok 2-4 total (1 broad category + 1-2 niche; caption keywords and spoken words outweigh hashtags); Instagram officially recommends 3-5 relevant hashtags (Mosseri: 'hashtags are not a way to get more reach'); YouTube Shorts: #Shorts plus 2-3 topical tags is sufficient — title matters far more.
- Shorts SEO 2026: title is the strongest metadata signal — primary keyword in first 5-7 words, 40-60 chars total; description first ~100 chars should restate the topic; Jan 2026 YouTube search added a dedicated Shorts filter, making Shorts titles searchable inventory.
- Hook evidence: viewers decide in ~1.3-3 seconds; Shorts with a hook in the first 2 seconds retain ~19% more viewers (Zebracat 2025); Meta data: 65% of 3-second viewers reach 10 seconds; effective patterns: bold claim, number hook, mistake reveal, curiosity gap, pattern interrupt in second 1.
- A/B measurement endpoints: YouTube Analytics API metrics views, engagedViews (views past initial seconds), averageViewPercentage, likes, shares, subscribersGained; Instagram media insights for Reels: views, reach, likes, comments, shares, saved, total_interactions, ig_reels_avg_watch_time (impressions deprecated for media after Jul 2, 2024); TikTok Display API video.list/query returns like_count, comment_count, share_count, view_count (requires video.list scope).
- TikTok requires a preflight GET /creator_info/query before every post (returns privacy_level_options, posting eligibility, max video duration) and its audit checks UX rules: user-selected privacy with no default, duet/stitch toggles unchecked by default, music usage confirmation text, commercial content disclosure toggles.

## Gotchas

- TikTok audit is the critical path: until your API client passes the Content Posting audit, every post is forced SELF_ONLY (invisible) — there is no toggle around it; unaudited clients also cap at 5 posting users/24h. Apply weeks before launch.
- YouTube's equivalent trap: uploads from unverified API projects are locked private until the project passes the YouTube API compliance audit — your first automated Shorts will silently be private if you skip this.
- TikTok per-creator cap ~15 API posts/day is shared across ALL API clients (if the streamer's account also uses Ayrshare or another tool, budgets collide) and burst posting from a new account is the top documented spam_risk_too_many_posts trigger.
- No trending/commercial sounds via TikTok API and no Instagram music library via API — baking copyrighted music into uploaded files risks mutes/strikes (business accounts are limited to the Commercial Music Library). Use original stream audio; add native sounds only on manual in-app posts.
- No custom thumbnails for Shorts via API; thumbnail locked after publish — bake a designed frame into the video before upload.
- TikTok Originality Policy (Sep 15, 2025) demotes third-party watermarks and near-duplicates; YouTube's 'inauthentic content' policy (Jul 15, 2025) can demonetize templated mass-produced AI clip channels — differentiate edits per account and keep proof of rights to the main channel's footage.
- Datacenter-IP danger is about account creation/login sessions, not API calls: never create or warm accounts from Hetzner/Vercel egress; do creation, warm-up, and OAuth consent from residential IP + real device. Never create multiple accounts same day/same device.
- Identical posting timestamps or identical video bytes across your differentiated accounts are coordination fingerprints — jitter times ±15-90 min and vary trims/overlays.
- Meta's docs are internally inconsistent on the IG publish cap (50 vs 100 per 24h) — trust GET /{ig-user-id}/content_publishing_limit at runtime; also TikTok API strips line breaks from captions, and IG audio_name is settable exactly once.
- The Dec 4, 2025 videos.insert quota drop (1600→~100 units) is recent — older tooling/docs still assume 6 uploads/day per 10k quota; re-check your project's actual quota. Likewise the claimed 'Mosseri Dec 2025 5-hashtag cap' comes from secondary blogs and is unverified — rely on the official 3-5 recommendation.
- Retention metrics are not available via TikTok's API (view/like/comment/share counts only) — your A/B loop must use velocity + ratio proxies there, and hook-level retention testing is only fully measurable on YouTube (engagedViews) and IG (ig_reels_avg_watch_time).
- Engagement-bait captions ('comment X', 'watch till the end') are explicitly policy-risky on YouTube/Meta — keep them on the generator's banned list, not just for style reasons.

## Full details

## PART A — FRESH-ACCOUNT TRUST AND API POSTING

### A1. Hard platform/API gates you must clear BEFORE launch (these dominate the timeline)

**TikTok Content Posting API (developers.tiktok.com):**
- **Unaudited-client lock**: every post from an unaudited API client is forced to `SELF_ONLY` visibility; error `unaudited_client_can_only_post_to_private_accounts` fires otherwise; max **5 users per 24h** may post through an unaudited client, and their accounts must be private at post time. You must pass TikTok's **Content Posting API audit** (separate from developer signup) to post publicly. Budget 2-6 weeks; the audit reviews UX compliance (see below).
- **Rate limits**: **6 requests/minute per user access_token**; per-creator daily cap of **~15 API posts/day shared across all API clients** (Ayrshare documents "6 videos per minute with an upper limit of 15 videos per day"); max 5 pending shares per user per 24h.
- **Preflight required**: call `GET /v2/post/publish/creator_info/query/` before each post — returns `privacy_level_options`, `max_video_post_duration_sec`, and whether the creator can post right now. The audit checks that your flow (even an internal tool) honors this, shows the creator nickname, makes privacy a user selection with **no default**, keeps duet/stitch toggles unchecked by default, and shows the "Music Usage Confirmation" line.
- **Direct Post fields** (`/v2/post/publish/video/init/` with `post_info`): `title` (max **2,200 UTF-16 chars**, hashtags/mentions auto-parsed), `privacy_level` (must match creator_info options), `disable_duet`, `disable_stitch`, `disable_comment`, `video_cover_timestamp_ms` (cover frame in ms), `brand_content_toggle`, `brand_organic_toggle`, **`is_aigc`** (true → "Creator labeled as AI-generated"). `PULL_FROM_URL` requires domain ownership verification (`url_ownership_unverified` error). Chunked upload: `chunk_size` (e.g., 10,000,000 bytes), `total_chunk_count`, PUT with `Content-Range`.
- **Spam errors**: `spam_risk_too_many_posts` (daily cap / burst posting / repeated similar content from a new app or account), `spam_risk_user_banned_from_posting`, `spam_risk_too_high` status, `reached_active_user_cap`. Practitioner lore (Postly, bundle.social, zernio): these fire disproportionately on **new accounts + duplicate-looking captions/videos + queue dumps**; fix is manual posting history first, spacing posts, varying captions.
- **No sound attachment**: the official API exposes no parameter to attach TikTok library/trending/commercial sounds to videos (`auto_add_music` exists only for photo posts). Any music must be pre-mixed into the file — which for commercial accounts creates licensing exposure (general library is licensed for personal use; business accounts are limited to the Commercial Music Library in-app). For stream highlights, ambient/voice audio is the safe path.

**Instagram Graph API (Instagram Platform docs):**
- Requires an **Instagram professional account** (Business or Creator) linked appropriately (Business Login for Instagram or FB Login). 
- **Rate limit: 100 API-published posts per 24-hour moving window** (carousels count as 1). Older docs pages still say 50 — the authoritative check is `GET /{ig-user-id}/content_publishing_limit?fields=quota_usage,config` (also accepts `since`). Poll it in your scheduler.
- Reels flow: `POST /{ig-user-id}/media` with `media_type=REELS`, `video_url`, `caption`, optional `cover_url` or `thumb_offset`, `share_to_feed`, `audio_name`; poll container `status_code` = FINISHED; then `POST /{ig-user-id}/media_publish`. Caption limit 2,200 chars, max 30 hashtags technically (use 3-5).
- **`audio_name` can be set only once** (at container creation or later once in-app); default is "Original Audio". A branded audio name ("<YourBrand> highlights") makes reuse attributable.
- **No Instagram music library via API** — music must be baked into the uploaded file.
- JPEG only for images; shopping tags/filters unsupported.

**YouTube Data API:**
- `videos.insert` — **quota cost dropped from ~1,600 to ~100 units on December 4, 2025** (official revision history). With the default 10,000 units/day, uploads are no longer the scarce resource (~100/day possible). Verify in your Cloud console quota page — per-project quotas can differ.
- **Unverified API project = uploads locked private** (policy since Jul 28, 2020; still enforced): all `videos.insert` uploads from unaudited/unverified projects are restricted to private and the creator gets an email. You must complete the **YouTube API Services compliance audit** (and OAuth verification) for public publishing. Budget weeks; apply at project start.
- Shorts are not a separate endpoint: any ≤3-minute vertical video is auto-classified as a Short. **`thumbnails.set` does not apply to Shorts** — no custom Shorts thumbnail via API; workaround: bake a designed 9:16 frame into the video and select it in Studio (desktop custom Shorts thumbnails rolled out through 2025; locked after publish). Title ≤100 chars; description ≤5,000 chars.
- New channels: phone verification unlocks >15-min uploads and is a prerequisite for **intermediate/advanced features** (support.google.com/youtube/answer/9891124) which raise the (unpublished, channel-history-dependent) daily upload cap. YouTube confirms newer/unverified channels get lower daily upload limits; mass-uploading in a short window trips spam filters.
- `status.containsSyntheticMedia` (added Oct 30, 2024) is settable on upload — use it for realistic AI-altered content disclosure.
- **Monetization landmine**: "inauthentic content" policy (renamed from "repetitious content", **July 15, 2025**) — mass-produced/templated content is ineligible for YPP; clip/reused content needs transformative value (commentary, editing, analysis). For clips of *your own* main-channel streams, keep documentation of ownership and differentiate the clip channel's presentation.

### A2. Does API publishing underperform native? (Evidence)
- **No platform down-ranks API posts.** Meta docs treat Content Publishing as the official surface; there is no "scheduled tier". Adam Mosseri has said scheduled posts do not get lower reach. Buffer's own resource and Social Status's analysis concur.
- **Hootsuite 2025 experiment**: 5 native vs 5 scheduled posts, same account/content/times — scheduled won (8.19% vs 6.44% engagement, higher reach).
- **Why the myth persists (and the real residual risks)**: (1) *behavioral* differences — scheduled accounts often post-and-ghost (no session, no reply activity around the post); (2) **feature gaps** — TikTok API posts can't use trending sounds, in-app text/stickers, or native editing, and those features correlate with distribution; (3) **watermarks** — TikTok's Originality Policy (enforced Sep 15, 2025) demotes visible third-party watermarks and near-duplicates; cross-posted content with TikTok/CapCut watermarks is demoted on Reels/Shorts too. So the deficit is real for API posts that *look* API-made, not for API posting per se.

### A3. Warm-up consensus (practitioner, 2025-2026 — no platform publishes official numbers)
- **TikTok**: 7-14 days of real-looking native activity before posting (watch feed 15-30 min/day, like/comment sparingly, follow niche accounts, complete profile + PFP + bio, verify phone AND email). Post the first 3-7 videos manually in-app (this also lets you use native sounds/text). Multiple tool vendors (Postly, Conbersa, reel.farm, tokportal) independently advise **manual posting for the first 1-3 weeks before switching to API** — new accounts posting via API from day 1 are the classic `spam_risk` trigger.
- **Instagram**: slowest trust curve — 2-4 weeks. Community-consistent sequence: complete profile → scroll/watch → follow (5-10/day) → like → view stories → comment → first feed post → first Reel; DMs last. Start 5-10 actions/day, scale gradually. Create as personal, convert to professional after ~3-7 days of normal use (conversion on day 0 plus instant API hookup is a common flag pattern). First 3-5 Reels manual, in-app.
- **YouTube**: least behavior-sensitive, most verification-sensitive. Day 1: phone verify, complete channel art/description/links, then complete the advanced-features verification path. New channels should upload the first few Shorts via Studio, 1/day, before API ramp. Channel age matters less than verification level + strike-free history.

### A4. Safe cadence ramp (synthesis of platform caps + practitioner guidance)
| Week | TikTok | IG Reels | YT Shorts |
|---|---|---|---|
| 0 (setup) | 0 posts — warm-up activity only | 0-1 feed post | 0; verify channel |
| 1 | 1/day manual, in-app | 1 Reel every other day, in-app | 1/day via Studio |
| 2 | 1/day (mix manual + first API posts) | 1/day manual | 1-2/day (start API) |
| 3 | 2/day API, jittered times | 1/day API | 2/day API |
| 4+ steady | 2-3/day (hard ceiling ~15/day API; stay far below) | 1-2/day (ceiling 100/24h API; irrelevant in practice) | 2-3/day (watch unpublished channel cap; back off on any "upload limit reached") |
Spam triggers to avoid: queue dumps (several posts in minutes), identical/near-identical captions across posts, >5 pending TikTok shares, posting the exact same minute every day, and reposting identical video bytes across accounts (vary encode/trim/overlay per account).

### A5. Automation-specific risk factors
- **Datacenter IPs (Hetzner/Vercel egress)**: two different threat models. (a) *Official API calls* (OAuth'd server-to-server posting) from cloud IPs are the designed use — every scheduler (Buffer, Later, Ayrshare) posts from AWS/GCP. No evidence of penalty. (b) *Account creation, login sessions, and browser/app automation* from hosting ASNs are actively scored: TikTok labels accounts "datacenter IP risk" and combines IP + device fingerprint + behavior into a risk score; Instagram flags hosting ASN ranges. **Rule: create accounts, do warm-up, and complete the OAuth consent flows from a residential IP on a real device/browser; run the posting daemon wherever you like.**
- **Same-day/same-device multi-account creation**: high-risk correlation signal on TikTok/IG (device fingerprint + IP + email pattern). Stagger creations by ≥3-7 days, use different devices or at least different browser profiles/networks, unique phone numbers/emails per account.
- **Identical timestamps across accounts**: coordination fingerprint (and Instagram explicitly polices "coordinated inauthentic behavior"). Add ±15-90 min random jitter per account per platform; don't post the same clip to both differentiated accounts the same hour.
- **One clip → many accounts**: your revised 1-2 differentiated accounts/platform plan is right; also differentiate the *files* (different trim, caption style, overlay) so perceptual-hash duplicate detection (TikTok Originality Policy, YouTube inauthentic content) doesn't chain them.
- **Linking to the main channel**: no platform grants formal "trust inheritance" to a linked account — bio links, IG account linking, and YouTube channel-header links carry zero documented algorithmic trust transfer. But linking is still net-positive: (1) it defends against impersonation/fan-channel takedowns (YouTube's fan-account policy requires obvious differentiation from the entity; being *officially* linked and named "<Main> Clips" with disclosure in bio removes ambiguity); (2) it documents your rights to the source content for YouTube's reused/inauthentic-content review; (3) a main-channel shout-out drives the early real engagement that actually builds the new account's trust. Added scrutiny risk is minimal compared to the risk of looking like an unauthorized clip farm.

### A6. Week-by-week launch playbook (deliverable)
- **Week -4 to -2 (paperwork first — the long poles are audits, not warm-up):** register TikTok developer app, request Content Posting API + `video.publish`/`video.upload` scopes, build the audit-compliant consent/post UI, **submit TikTok audit**. Create Google Cloud project, configure OAuth consent, **submit YouTube API compliance audit + OAuth verification**. Create Meta app, Business verification if needed, request `instagram_content_publish` (+ `instagram_business_basic`) advanced access via App Review.
- **Week 0:** create accounts from residential IP/real devices, staggered (one platform's accounts per day, second differentiated account 3-7 days later). Phone + email verify everything. Complete profiles fully (PFP, banner, bio with main-channel link and "official clips channel" disclosure). Convert IG to professional after 3-7 days. YouTube: run advanced-features verification. Cross-link everything to the main channel; announce the clip accounts on the main channel.
- **Weeks 1-2:** manual warm-up per A3; first posts native in-app (TikTok: use a trending-but-licensed sound natively here — API can't later). Main channel drives initial follows.
- **Week 3:** begin API posting at 1/day interleaved with manual posts. Instrument: log `content_publishing_limit` (IG), every TikTok publish status (`processing/publish_complete/failed/spam_risk_*`), YouTube upload status. Any spam_risk or action block → stop API posting on that account for 48-72h, resume manual.
- **Week 4-6:** ramp per A4 table to steady state; start the A/B metadata loop (B4). Keep ≥1 manual/native post per account per week indefinitely (session activity + access to native-only features).

## PART B — AI TITLE/HOOK/CAPTION GENERATION

### B1. What drives reach in 2026 (per platform)
- **TikTok**: search is now a primary surface (~3B searches/day claimed; 74% of Gen Z search on TikTok). Ranking inputs: interactions + content info (keywords in caption, spoken words via auto-transcription, text overlay, hashtags, sounds). Caption = strongest controllable SEO lever: **target keyword in the first ~80 characters**, natural phrasing, keyword also spoken or in text overlay in first seconds. Hashtags: **1 broad + 1-2 niche** (2-4 total); keyword text outweighs hashtags. Formats that rank in search: how-to, "X vs Y", behind-the-scenes — for gaming highlights, frame clips as searchable moments ("how <streamer> clutched a 1v4 in <game>") rather than context-free reactions.
- **YouTube Shorts**: **title is the dominant metadata signal**; put the primary keyword in the first 5-7 words; keep ~40-60 chars so it isn't truncated on mobile. Description: restate topic in first ~100 chars (Shorts descriptions are lightly weighted vs titles but feed search). Jan 2026: YouTube search gained a Shorts-type filter → Shorts titles are now genuine search inventory. #Shorts hashtag optional but harmless; 2-3 topical hashtags max. Ranking behavior: viewed-vs-swiped ratio and whether your Short leads to more Shorts consumption; velocity of likes/comments in hour 1.
- **Instagram Reels**: ranking = watch time (especially first-3s retention), likes/saves/shares/sends-per-reach. Mosseri: hashtags are categorization, **not** reach; official guidance **3-5 relevant hashtags** (one Dec-2025 report claims a hard cap of 5 was announced — unverified, treat as directional). SEO now reads caption keywords (Instagram has been surfacing Reels in Google since mid-2025). First caption line is the hook shown before "...more" (~125 chars visible).
- **Hooks (cross-platform evidence)**: decision window ~1.3-3s; hook in first 2s → ~19% better retention (Zebracat 2025 Shorts data); Meta: 65% of 3-second viewers reach 10s. Proven text-hook patterns for clips: bold claim ("the best <X> play you'll see today"), number hook ("3 seconds that broke the lobby"), mistake/reveal ("he thought it was over"), direct-quote hook (best line from transcript as overlay), curiosity gap that the clip resolves. Since these are 10-30s highlight clips: the video's own first second is the real hook — pick the in-point at the loudest transcript moment and let title/overlay set the stakes.

### B2. Hard metadata constraints matrix (what your generator may/may not emit)
| Field | TikTok API | Instagram API | YouTube API |
|---|---|---|---|
| Title/caption | single `title` field, ≤2,200 UTF-16, line breaks stripped, hashtags inline | `caption` ≤2,200, line breaks OK, ≤30 tags | `title` ≤100 chars (no `<`/`>`), `description` ≤5,000 |
| Thumbnail/cover | `video_cover_timestamp_ms` only (frame from video) | `cover_url` image or `thumb_offset` | none for Shorts (bake frame into video) |
| Sounds/music | cannot attach library/trending sounds; audio must be in file | no music library; audio in file; `audio_name` settable once | audio in file |
| AI label | `is_aigc: true` | (auto-detection; no explicit param) | `status.containsSyntheticMedia` |
| Other | `privacy_level` required from creator_info; duet/stitch/comment toggles | `share_to_feed`, `collaborators`, location | `categoryId` (20 = Gaming), `tags[]` (~500 chars total), `selfDeclaredMadeForKids: false` |

### B3. Metadata-generation spec (deliverable)
**Inputs**: clip transcript (with timestamps + speaker), streamer name/handle, game/category, moment type (clutch/fail/funny/rage/wholesome), clip duration, detected peak moment quote, target platform(s), account voice profile (per differentiated account), recent-post captions (for dedup), banned-phrase list.
**Pipeline (one LLM call per clip, structured output):**
1. *Extract*: the single most quotable line, the stake ("what almost happened"), and 2-4 search keywords (game + action, e.g., "valorant clutch ace").
2. *Generate 3 hook candidates* using distinct patterns (quote-hook, bold-claim, number/stakes) — grounded rule: every factual claim must be verifiable from the transcript; prefer verbatim quotes.
3. *Render per platform* from the winning hook: TikTok `title` = hook + keyword phrase in first 80 chars + 2-3 hashtags (1 broad like #<game>, 1-2 niche) — total ≤150 chars works best despite the 2,200 cap; YouTube `title` ≤60 chars keyword-first + `description` (first line = keyword sentence, then credit + main-channel link, #Shorts + 2 tags) + `tags[]`; IG `caption` first line ≤125-char hook, blank line, 1-2 context sentences with keywords, 3-5 hashtags at end.
**Banned-cliché list (enforce in prompt AND post-filter)**: "You won't believe", "Wait for it", "gone wrong", "breaks the internet", "INSANE"/"CRAZY" (all-caps), ">3 emojis", "Like and follow for more", "watch till the end", "epic fail", "just wow", rhetorical "Did he really just…?" openers, and any claim not in the transcript. Also ban engagement-bait ("comment X if…") — explicitly policy-risky on YouTube/Meta.
**Prompt-structure guidance that works**: give the model the platform constraints as literal limits; demand JSON matching your per-platform schema; show 2-3 gold examples from your niche; instruct "quote the transcript verbatim where possible; never invent events"; generate all platform variants in one call from one transcript (cheaper, keeps facts consistent, forces differentiation via per-account voice profiles rather than re-rolls).
**Per-platform output fields**: `tiktok: {title, privacy_level, disable_comment:false, video_cover_timestamp_ms, is_aigc}`, `instagram: {caption, audio_name(first post only), cover_url|thumb_offset, share_to_feed:true}`, `youtube: {title, description, tags[], categoryId:"20", containsSyntheticMedia}`.

### B4. Lightweight A/B loop via analytics APIs
- **YouTube Analytics API** (`reports.query`, dimension `video`): `views`, `engagedViews` (views past initial seconds — best proxy for hook success on Shorts), `averageViewPercentage`, `averageViewDuration`, `likes`, `shares`, `subscribersGained`. Primary KPI: engagedViews/views and averageViewPercentage at T+72h.
- **Instagram media insights** (`GET /{ig-media-id}/insights`): Reels metrics `views`, `reach`, `likes`, `comments`, `shares`, `saved`, `total_interactions`, `ig_reels_avg_watch_time` (ms). Note `impressions` deprecated for media created after Jul 2, 2024; `plays` consolidated into `views` (2025). KPI: views/reach ratio (replays) + avg_watch_time/clip_length.
- **TikTok Display API** (`POST /v2/video/list/` and `/v2/video/query/`, scope `video.list`): fields `id, title, view_count, like_count, comment_count, share_count, create_time`. No retention metric via API (retention only in in-app analytics) — use view_count velocity at T+24h/T+72h and share_count/view_count. KPI caveat: TikTok views count ~instantly, so pair with likes/views.
- **Loop design**: tag every post in your DB with metadata-variant features (hook pattern, keyword position, hashtag count, caption length, emoji use, title style). Poll analytics at +24h/+72h/+7d. Because clip quality is a massive confound, compare *hook patterns across ≥20 clips per arm* (not per-clip A/B), or run paired tests: same clip, different metadata, one per differentiated account (with jittered timing). Recompute pattern win-rates weekly; feed the top pattern back into the generator's example slots; retire arms with <40% win rate. Guard: never repost an identical video to the same account for A/B — duplicate demotion pollutes results and risks spam flags.

## Sources

- [TikTok Content Posting API — Direct Post reference (fields, rate limits, errors)](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Content Posting API — Get Started (unaudited client restrictions)](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [TikTok Content Sharing Guidelines (audit UX requirements, unaudited caps)](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [Instagram Platform — Content Publishing (100 posts/24h, content_publishing_limit)](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Instagram Media Insights reference (Reels metrics, deprecations)](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights)
- [YouTube Data API Revision History (Dec 4, 2025 videos.insert quota change; synthetic media)](https://developers.google.com/youtube/v3/revision_history)
- [YouTube Data API — videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube Analytics API — Metrics (engagedViews, averageViewPercentage)](https://developers.google.com/youtube/analytics/metrics)
- [YouTube Help — Channel monetization policies (inauthentic content, Jul 15 2025)](https://support.google.com/youtube/answer/1311392)
- [YouTube Help — Intermediate and advanced features (phone verification, upload limits)](https://support.google.com/youtube/answer/9891124)
- [Ayrshare — TikTok API docs (6/min, 15/day, caption rules, AIGC toggle)](https://www.ayrshare.com/docs/apis/post/social-networks/tiktok)
- [Ayrshare — Instagram API capabilities (audio_name rules)](https://www.ayrshare.com/blog/the-instagram-api-just-went-to-11/)
- [Social Status — Does Hootsuite/Buffer cause lower reach? (2025 experiment data)](https://www.socialstatus.io/does-hootsuite-buffer-cause-lower-reach-and-engagement/)
- [Buffer — Will scheduling posts affect my engagement?](https://buffer.com/resources/scheduled-posts/)
- [Multilogin — Do scheduled posts get less views? (Mosseri statement)](https://multilogin.com/blog/do-scheduled-posts-get-less-views/)
- [Postly — How to fix TikTok's spam error when posting via third-party tools](https://blog.postly.ai/how-to-fix-tiktoks-spam-error-when-posting-via-postly-or-other-third-party-tools/)
- [bundle.social — TikTok API errors reference](https://bundle.social/tiktok-api/errors)
- [Later Help Center — Instagram auto-publish post limit](https://help.later.com/hc/en-us/articles/1500002144742-Instagram-Auto-Publish-Post-Limit)
- [Conbersa — Account warmup timeline (TikTok)](https://www.conbersa.ai/learn/account-warmup-timeline)
- [reel.farm — How to warm up a TikTok account (exact schedule)](https://reel.farm/guides/how-to-warm-up-tiktok-account)
- [Multilogin — How to warm up an Instagram account (2026 guide)](https://multilogin.com/blog/mobile/how-to-warm-up-instagram-account/)
- [Genviral — Warm up Instagram account (7-day plan)](https://www.genviral.io/blog/warm-up-instagram-account)
- [Proxidize — Instagram action block (2026)](https://proxidize.com/blog/instagram-action-block/)
- [ToDetect — TikTok datacenter IP risk scoring](https://www.todetect.net/article/multiple-account-management/tiktok-device/)
- [VoidMob — How Instagram detects multiple accounts (2026)](https://voidmob.com/blog/run-multiple-instagram-accounts-without-flags-2026)
- [SocialRails — YouTube upload limits complete guide (2026)](https://socialrails.com/blog/youtube-upload-limits-complete-guide)
- [vidIQ — YouTube Shorts custom thumbnails](https://vidiq.com/blog/post/youtube-shorts-custom-thumbnails/)
- [TokPortal — TikTok sounds via API: what's possible](https://www.tokportal.com/learn/tiktok-sounds-api)
- [Publer — How to rename original audio for Reels](https://publer.com/help/en/article/how-to-rename-the-original-audio-for-reels-1aqq2g1/)
- [Metricool — TikTok SEO guide 2026](https://metricool.com/tiktok-seo/)
- [Hootsuite — TikTok SEO expert tips](https://blog.hootsuite.com/tiktok-seo/)
- [Miraflow — YouTube Shorts SEO 2026 (title/description weighting)](https://miraflow.ai/blog/youtube-shorts-seo-2026-how-to-rank-in-search)
- [Mentionlytics — Instagram hashtags guide 2026](https://www.mentionlytics.com/blog/how-to-use-instagram-hashtags-ultimate-guide/)
- [Virvid — First 3 seconds: hook structures for Shorts (retention data)](https://virvid.ai/blog/first-3-seconds-hook-faceless-shorts-2026)
- [Plang Phalla — Hook science for Reels & Shorts 2025 (Meta 3s→10s data)](https://plangphalla.com/the-first-3-seconds-that-decide-hook-science-for-reels-shorts-in-2025/)
