# Research: kick-ingestion-feasibility

_Research date: 2026-08-15/16 (SaaS-pivot sweep). Requirements, prices, and timelines are time-sensitive — recheck official sources before relying on them._

## Summary

Kick's official public API (api.kick.com/public/v1, OAuth 2.1) exposes NO media: no VOD download, no clip create/retrieve, no livestream HLS/m3u8 URL. The Livestreams and Channels endpoints return metadata only (thumbnail, viewer_count, title, category) — the sole "url"/"key" fields are the streamer's own RTMP ingest URL + stream key (streamkey:read scope), i.e. where THEY push video, not where you pull it. A public /videos endpoint has been requested by devs and closed to the roadmap backlog with no shipped date. Therefore the compliant OAuth path CANNOT deliver source video at any scale — this is the decisive finding. Every tool that offers automatic Kick highlights today (Eklipse, StreamLadder ClipGPT) gets video by scraping Kick's UNDOCUMENTED endpoints (kick.com/api/v2/channels/{slug}/clips, /api/v1/video/{id} -> playback_url -> master.m3u8) behind Cloudflare, or by pasting public clip/VOD URLs, or by user upload. Sizzle AI refuses to integrate Kick at all and requires manual download+upload. At multi-tenant scale, server-side ripping means fighting Cloudflare JA3/JA4 TLS fingerprinting, cf_clearance cookies, Turnstile CAPTCHA and ~100 req/10s rate limits, effectively requiring residential proxies and curl_cffi impersonation that break constantly (yt-dlp's Kick extractor 403s repeatedly) — which is exactly the DMCA-1201 + ToS-violation architecture prior legal research flagged, now confirmed technically fragile too. The $100K Kick Dev fund (Mar-May 2025) is a build-on-our-API contest for viewer-facing tools; there is zero evidence it grants media/VOD access and no sanctioned media route exists. VERDICT: the only buildable, ToS-compliant, 1000+-tenant path is USER-INITIATED CAPTURE — a browser extension recording the user's own Kick session, an OBS/local-recording upload flow, or paste-your-own-VOD/clip-URL upload — with the streamer-consented RTMP restream relay (via streamkey:read) as a higher-fidelity but higher-friction option. Winz must become upload-first / extension-first, not the fully-automatic server-side "connect and forget" product; that reshapes onboarding and is the central product tradeoff.

## Key facts

- Kick's official public API has NO media endpoints: no VOD download, no clip creation/retrieval, no livestream HLS/m3u8 playback URL. Confirmed against docs.kick.com index (Aug 2026): endpoints are Categories, Users, Channels, Channel Rewards, Chat, Moderation, Livestreams, KICKs, Public Key, Webhooks/Events, Drops, Org Management.
- Livestreams endpoint returns metadata ONLY (id, title, thumbnail image, viewer_count, started_at, language, tags, category, broadcaster) — explicitly no playback/HLS/m3u8 URL. Channels GET returns a stream object with url + key fields, but these are the streamer's OWN RTMP ingest URL and stream key (gated by streamkey:read scope), for publishing TO Kick, not pulling their broadcast.
- The 11 OAuth 2.1 scopes today: user:read, channel:read, channel:write, channel:rewards:read, channel:rewards:write, chat:write, streamkey:read, events:subscribe, moderation:ban, moderation:chat_message:manage, kicks:read. NONE grants video/VOD/clip/media access.
- An official videos endpoint (api.kick.com/public/v1/videos) does NOT exist. It was requested in KickDevDocs issue #125 (opened Apr 8 2025), closed into the 'Kick Dev' backlog with no owner, milestone, or ship date. A public roadmap board exists (github.com/orgs/KickEngineering/projects/3) but Kick states they 'aren't at that stage yet' for a timeline. A dev asking whether undocumented /api/v2 endpoints are safe for production (issue #348, Mar 2026) got no official reply.
- Eklipse (largest auto-Kick-highlighter) onboards by pasting a Kick profile URL (kick.com/yourchannel) — NOT OAuth — then fetches the VOD server-side automatically ~30-45 min after stream end and returns 9:16 clips in 20-60 min. This is undocumented-endpoint scraping, not official API. Free tier 15 clips/stream 720p, paid = 1080p/no watermark.
- StreamLadder ClipGPT ingests by pasting a public Kick VOD or clip URL ('No account connection required'), or by file upload; a 2h stream analyzes in ~5 min. Sizzle AI does NOT integrate Kick at all — Kick VODs 'require manual download and upload,' up to 4h processing even for paid users.
- Undocumented capture chain (documented by scraping guides, Aug 2026): kick.com/api/v2/channels/{slug} and /clips return metadata + clips; playback_url field yields HLS master.m3u8; /api/v1/video/{id} yields VOD JSON. All sit behind Cloudflare.
- Cloudflare protection on Kick (2026): TLS JA3/JA4 fingerprinting checked BEFORE User-Agent, cf_clearance cookie challenge, occasional Turnstile CAPTCHA. Datacenter IPs work only under ~200 req/hr/IP; rate limit ~100 req/10s/IP triggers 429 then temp bans. Plain Python requests are fingerprinted instantly; curl_cffi Chrome impersonation is required. Residential proxies strongly recommended for volume.
- yt-dlp's Kick extractor repeatedly 403s on /api/v1/video/{id} and the HLS playlist; --impersonate chrome alone did not fix issue #16012 (Feb 2026); the extractor breaks recurrently, evidencing that unattended server-side ripping is unreliable, not just legally risky.
- Kick ToS explicitly prohibits 'copying, distributing... any part of the Service... by any automated or non-automated scraping' and 'using any automated system, including robots, spiders, offline readers,' and bars automated data collection 'for resale or competitive replication' — a clip-SaaS ripping VODs server-side is squarely in scope.
- Kick VOD retention is short: 7 days for non-verified streamers, 30 days for verified, then auto-deleted; there is a cap on stored replays. This constrains any 'we'll grab it later' server-side model and pushes toward capturing at/near stream end.
- Kick has NO native VOD download button; Kick's own help article tells creators to paste the VOD URL into a third-party tool. Native Kick CLIPS are downloadable as .mp4 and run 10-180 seconds (3-min max as of Feb 2026) — user-made, not auto-highlights of a full VOD.
- The $100,000 Kick Dev fund launched Mar 6 2025 (entries to May 7, winners May 21 2025) rewards viewer-value tools (overlays, chatbots, mod tools, analytics, engagement). No evidence any winner or partner received media/VOD/elevated access; it is not a media-access route. Register apps at dev.kick.com.
- Browser-extension capture works in the USER's own authenticated session (no proxy/Cloudflare fight, no Winz-owned infringing copy), but Manifest V3 constraints bite for hours-long VODs: background service workers auto-terminate when idle, MediaRecorder chunks are unpredictable (up to ~50MB), and multi-GB captures strain upload/storage. Existing Kick VOD extensions record in ~15-min segments to .m4v and hit a ~10-day source-age limit and frequent breakage.

## Gotchas

- Do NOT mistake the Channels endpoint's stream.url / stream.key for a media handle. With streamkey:read these are the streamer's OWN RTMP ingest URL and key (used to broadcast TO Kick). They enable a consented restream-relay capture, but they are NOT a way to pull an existing broadcast/VOD for clipping.
- Eklipse's 'connect your Kick' is URL-based scraping, not OAuth. Copying its 'paste channel URL, we auto-fetch the VOD' UX means copying its undocumented-endpoint scraping — the exact server-side-ripping architecture prior legal research flagged as highest-risk. Its ease of onboarding is not evidence of a compliant method.
- The undocumented /api/v2 and /api/v1/video endpoints can vanish or change without notice — Kick declined to say they're safe for production (issue #348). Cloudflare JA3/JA4 fingerprinting + Turnstile mean any server-side puller needs curl_cffi impersonation AND residential proxies, and still breaks (yt-dlp 403 history). Budget for perpetual maintenance if you go this way (recommendation: don't).
- Kick VOD retention is only 7 days (non-verified) / 30 days (verified) with a stored-replay cap. Any 'we'll grab it later' design has a narrow window and can miss content entirely — favor capture-at-broadcast (extension or relay).
- Manifest V3 is a real constraint for hours-long capture: service workers auto-terminate when idle, so recording must run in a foreground tab or offscreen document the user keeps open the whole stream, with chunked upload to survive unpredictable ~50MB MediaRecorder slices and multi-GB totals. This is engineering-heavy and a support magnet.
- The $100K Kick Dev fund is a viewer-value contest (overlays/bots/analytics), not a media-access program. No winner or partner is known to have received VOD/elevated access. Do not premise the roadmap on getting special access — there is no application path for it.
- Native Kick clips are capped at 10-180 seconds (3-min max, Feb 2026) and are user-selected, so importing them is not equivalent to auto-highlighting a full multi-hour VOD. They're a useful supplementary input, not the core ingestion.
- Sizzle AI's refusal to integrate Kick (manual download+upload only, up to 4h processing) is the honest-but-friction benchmark; StreamLadder's frictionless 'paste public VOD URL' still leans on Kick's public pages. Winz's onboarding conversion will live or die on how well it hides the necessary user-initiated capture step.

## Full details

## The core question, answered

Winz's whole product hinges on obtaining source **video** for each tenant. Prior legal research already condemned server-side ripping of Kick VODs (Winz-owned infringing copies, no DMCA 512 safe harbor, DMCA 1201(a)(2) trafficking exposure from bot-detection bypass). This sweep asked the empirical follow-up: **can any compliant path actually deliver video at 1,000+ tenant scale?** The answer is a hard constraint on the product.

---

## 1. Kick's official public API surface (verified against docs.kick.com, Aug 2026)

**No media endpoints exist. Not for VODs, not for livestream media, not for clips.** The full documented endpoint set is:

- **Categories** (GET), **Users** (GET, `user:read`), **Channels** (GET/PATCH), **Channel Rewards** (channel points), **Chat** (send/delete, `chat:write`), **Moderation** (`moderation:ban`, `moderation:chat_message:manage`), **Livestreams** (GET), **KICKs / Leaderboard** (`kicks:read`), **Public Key**, **Webhooks/Events** (`events:subscribe`), **Drops**, **Organization Management**.

**Livestreams GET** returns metadata only: `id` (UUID), `title`, `thumbnail` (image), `viewer_count`, `started_at`, `language`, `tags`, `category`, `broadcaster_user`, `channel.slug`. There is **no playback URL, no HLS/m3u8 field**.

**Channels GET** returns a `stream` object with `is_live, viewer_count, start_time, thumbnail, url, key`. Do not be misled by `url`/`key`: these are the streamer's **own RTMP ingest URL and stream key** (gated behind the `streamkey:read` scope — "Read a user's stream URL and stream key"). That is where the streamer *pushes* video into Kick, not a handle to *pull* their broadcast out for clipping.

**OAuth 2.1 scopes (complete list today):** `user:read`, `channel:read`, `channel:write`, `channel:rewards:read`, `channel:rewards:write`, `chat:write`, `streamkey:read`, `events:subscribe`, `moderation:ban`, `moderation:chat_message:manage`, `kicks:read`. **None** touches video/VOD/clip/media.

**Roadmap:** A `/public/v1/videos` endpoint was explicitly requested (KickDevDocs **issue #125**, opened 8 Apr 2025) and **closed into the "Kick Dev" backlog** with no owner, milestone, or date. A public roadmap board exists (`github.com/orgs/KickEngineering/projects/3`) but Kick says they "aren't at that stage yet" for a timeline. In **issue #348** (Mar 2026) a developer asked whether the undocumented `/api/v2` endpoints are safe for production use; **Kick gave no answer** (only a "triage" label). The official changelog shows active development through early 2026 on chat, rewards, moderation, leaderboards — never media. **Conclusion: do not plan around an official media endpoint arriving on any known timeline.**

---

## 2. How tools that support Kick today actually get the video

| Tool | Ingestion method | Auth | Notes |
|---|---|---|---|
| **Eklipse** (largest auto Kick highlighter) | Paste **Kick profile URL** (`kick.com/yourchannel`); Eklipse then **fetches the VOD server-side automatically** ~30-45 min after stream end | **URL only — NOT OAuth** | Undocumented-endpoint scraping. Returns 9:16 clips 20-60 min post-stream. Free = 15 clips/720p; paid = 1080p/no watermark. Also ships a standalone "Kick VOD Downloader" web tool. |
| **StreamLadder ClipGPT** | Paste a **public Kick VOD or clip URL** ("No account connection required"), or **file upload** | None / upload | 2h stream analyzed in ~5 min. Also imports a single public Kick clip URL (`kick.com/user?clip=…`) into the editor. |
| **Sizzle AI** | **No Kick integration** — Kick VODs "require manual download and upload" | Upload only | Up to 4h processing even on paid tiers. Tells you Kick can't be connected like Twitch/YouTube. |
| **Browser extensions** ("Kick VOD Downloader" et al.) | Record in the **user's own browser session**, ~15-min segments, .m4v | User's session | Frequent breakage, format friction, ~10-day source-age limit, must keep tab open. |
| **yt-dlp / CLI rippers** | Hit `/api/v1/video/{id}` then HLS `master.m3u8` | None (impersonation) | Repeated 403s; unreliable (see §3). |

The undocumented chain everyone actually uses: `kick.com/api/v2/channels/{slug}` and `/clips` for metadata + clip lists; the `playback_url` field yields the HLS `master.m3u8`; `/api/v1/video/{id}` yields VOD JSON. **All of it is behind Cloudflare and none of it is sanctioned.** There is **no evidence Kick partners with, or has whitelisted, any of these tools** — and no evidence Kick actively bans them either; the posture is passive tolerance of scraping that the ToS formally forbids.

---

## 3. Capture realities at scale (the part that breaks a naive server-side clone of Eklipse)

- **Cloudflare, top tier.** Kick serves a `cf_clearance` cookie challenge, checks **TLS JA3/JA4 fingerprints *before* the User-Agent**, and occasionally throws a **Turnstile CAPTCHA**. Plain `requests`/`http` clients are fingerprinted as bots instantly; you must use `curl_cffi` with Chrome/Safari impersonation (`chrome124/131`, `safari17_0`).
- **Datacenter IPs are throttled.** They work only under **~200 requests/hour/IP**; Cloudflare's rate limit is roughly **100 requests/10 s/IP/origin**, and repeated 429s escalate to temporary IP bans. **Residential proxies are effectively required** once you're pulling full VOD manifests + thousands of `.ts` segments per tenant per stream, multiplied across 1,000+ tenants. That is a large, recurring proxy bill and an ongoing cat-and-mouse maintenance load.
- **It breaks constantly.** yt-dlp's Kick extractor 403s on `/api/v1/video/{id}` and on the HLS playlist; issue #16012 (Feb 2026) showed `--impersonate chrome` alone did **not** fix it, and the extractor has a long history of repeated breakage (issues #6748, #8767, #14444, #16012). Unattended, per-tenant, scheduled ripping is therefore not just legally risky — it's **operationally fragile**.
- **ToS is explicit.** Kick prohibits "copying, distributing… any part of the Service… by any automated or non-automated 'scraping'" and "using any automated system, including 'robots,' 'spiders,' 'offline readers,'" and specifically bars automated collection **"for resale or competitive replication."** A clip SaaS ripping VODs server-side is the textbook target.
- **Short retention adds pressure.** VODs persist **7 days (non-verified) / 30 days (verified)** then auto-delete, with a cap on stored replays. A "grab it whenever" server-side model has a narrow window and can miss content entirely.

**Net:** replicating Eklipse's "paste your channel URL and we auto-rip" model at 1,000+ tenants is technically possible but requires residential-proxy infrastructure + Cloudflare-bypass maintenance, and it *is* the DMCA-1201/ToS-violation architecture already flagged. It does not become safe at scale; it becomes more exposed and more expensive.

---

## 4. The $100K Kick Dev fund is not a media-access route

Launched **6 Mar 2025**; entries accepted to **7 May 2025**; winners announced **21 May 2025**. It rewards tools that "create value for our viewers" — overlays, chatbots, moderation tools, analytics dashboards, engagement features — judged on originality, scalability, UX, and interactivity. Register/build via **dev.kick.com** with an OAuth app.

There is **no evidence any winner or participant was granted media/VOD/elevated access**, and **no documented partnership or application path to a media-level API tier exists.** Kick intends the bounty to recur, but it is a build-on-the-existing-API contest, not a gateway to video. Do not build a business plan on "we'll get special access."

*(One legitimate lever the API does offer: `streamkey:read` yields the streamer's own ingest URL + key. With the streamer's explicit OAuth consent this enables a **restream-relay** capture path — see §5 — which is first-party and scraping-free, but not "media access" in the VOD sense.)*

---

## 5. Fallback architectures — cost, UX, and what upload-first competitors reveal

**A. Browser-extension capture (record the user's own Kick session).** Compliant in principle — capture happens in the *user's* authenticated browser, so there's no Winz-owned direct-infringement copy and no Cloudflare/proxy fight. But **Manifest V3 makes hours-long capture painful**: background **service workers auto-terminate when idle**, so recording must live in a foreground tab / offscreen document the user keeps open for the entire stream; **MediaRecorder emits unpredictable chunk sizes** (mostly small, but observed spikes to ~50 MB) that must be chunk-uploaded to Winz to avoid 413s and memory blowups; multi-GB VODs strain CacheStorage (Chrome bug on 2 GB+ files) and upload pipelines. Existing Kick VOD extensions record in ~15-min segments to `.m4v`, hit a ~10-day source-age ceiling, and break frequently — a preview of the support burden. UX cost: the user must install an extension and leave a tab open live; it does not deliver the frictionless "connect and forget" promise.

**B. OBS-plugin / local-recording upload.** The streamer already records locally or via OBS; Winz ingests that file (or an OBS output/relay). Highest fidelity (source quality, no Cloudflare, unambiguously the user's own content), but highest onboarding friction (OBS reconfiguration, large uploads).

**C. Streamer-consented RTMP restream relay** (uses `streamkey:read`). Streamer points OBS at Winz's ingest; Winz records and forwards to Kick using the streamer's own key. First-party, scraping-free, near-live capture — but requires the streamer to change their broadcast setup, so it suits power users, not mass onboarding.

**D. Paste-your-own-VOD/clip-URL + upload (the Sizzle/StreamLadder pattern).** Lowest engineering lift; the *user* supplies the file or a public URL. Competitors reveal the friction cost plainly: **Sizzle refuses Kick auto-integration and forces manual download+upload with up to 4h processing**, and StreamLadder's frictionless-feeling "paste URL" for full auto-clipping still relies on Kick's public pages. The lesson: the automatic-Kick-highlight tools that feel magical (Eklipse) achieve it **only** by scraping; the ones that stay clean (Sizzle) accept manual upload and the conversion hit that comes with it.

---

## Verdict: which ingestion architecture is actually buildable, compliant, and scalable

1. **The official OAuth API cannot deliver source video — today or on any announced roadmap.** Any product design assuming "connect Kick via OAuth and we pull the VOD" is **not buildable.** This is the linchpin finding.
2. **Server-side auto-ripping (the Eklipse model) is buildable but is the flagged illegal/fragile path.** At 1,000+ tenants it demands residential proxies + curl_cffi Cloudflare bypass + constant maintenance, creates Winz-owned infringing copies, and triggers the DMCA-1201/ToS exposure prior research condemned. **Reject it** as the core architecture.
3. **The compliant, scalable core must be USER-INITIATED CAPTURE**, in priority order: (a) **browser-extension capture** of the user's own live session for the "automatic" feel while staying first-party; (b) **paste-your-own-VOD/clip-URL + file upload** as the zero-friction fallback and for users who won't install anything; (c) **OBS/local-recording upload** and (d) **streamer-consented RTMP restream relay** for power users wanting source quality. Native Kick clips (.mp4, 10-180 s) can also be imported directly, though they're user-selected, not auto-highlights.

### What this changes about Winz's product & onboarding

- **Winz is upload-first / extension-first, not "connect-and-forget."** The headline promise shifts from "we automatically grab your Kick VODs" to "install our extension (or drop your VOD) and we do the rest." Set that expectation on the landing page.
- **Onboarding gains an install/consent step.** Extension install + "keep this tab open while you stream," or an OBS output/relay setup for power users. This is the single biggest conversion risk and where product design effort should concentrate (auto-start recording on go-live, background chunked upload, clear capture status).
- **The "fully automatic post-stream" magic is only fully first-party if you capture live** (extension/relay), because Kick's 7/30-day retention + Cloudflare make reliable after-the-fact pulling impossible without scraping. Design for **capture-at-broadcast**, not fetch-later.
- **Legal posture improves structurally:** the source copy is created by the user in the user's session/software, Winz processes user-supplied media, and you can lean on DMCA 512 as a service processing user uploads — precisely the shelter the ripping model forfeits.
- **Cost model flips favorably:** no residential-proxy fleet, no Cloudflare-bypass maintenance; the cost moves to upload bandwidth/storage and a browser extension to maintain (Chrome Web Store review, MV3 upkeep).
- **Don't wait on Kick.** Track KickDevDocs issue #125 and the roadmap board, and register a dev app at dev.kick.com to use chat/events/OAuth for identity and posting — but treat an official video endpoint as upside, never as a dependency.

## Sources

- [Kick Public API Docs (docs.kick.com) — endpoint index & scopes](https://docs.kick.com/)
- [Kick API — Livestreams endpoints (metadata only, no playback URL)](https://docs.kick.com/apis/livestreams)
- [Kick API — Channels endpoints (stream.url/stream.key = ingest, streamkey:read)](https://docs.kick.com/apis/channels)
- [KickDevDocs Issue #125 — request to add videoId/videos endpoint (closed to backlog)](https://github.com/KickEngineering/KickDevDocs/issues/125)
- [KickDevDocs Issue #348 — using undocumented /api/v2 in production (no official reply)](https://github.com/KickEngineering/KickDevDocs/issues/348)
- [KickEngineering/KickDevDocs — repo, changelog, roadmap link](https://github.com/KickEngineering/KickDevDocs)
- [Kick public API roadmap board](https://github.com/orgs/KickEngineering/projects/3)
- [Eklipse — Kick Highlight / auto-clip feature (URL-based connect, server-side VOD fetch)](https://eklipse.gg/features/kick-highlight/)
- [Eklipse Help — How to Connect Your Kick Account (paste profile URL, not OAuth)](https://eklipse.gg/help/how-to-connect-your-kick-account-to-eklipse/)
- [StreamLadder ClipGPT — Auto-Clip Kick VODs (paste public VOD URL, no account)](https://www.streamladder.com/clipgpt/auto-clip/kick)
- [StreamLadder — importing clips from Kick (paste public clip URL)](https://www.streamladder.com/blog/new-feature-importing-clips-from-kick-to-streamladder)
- [Sizzle.gg FAQ / blog — Kick requires manual download and upload](https://www.origin.sizzle.gg/blog/?p=362)
- [Round Proxies — 6 Ways to Scrape Kick.com in 2026 (Cloudflare JA3/JA4, endpoints, rate limits)](https://roundproxies.com/blog/scrape-kick-com/)
- [yt-dlp Issue #16012 — Kick VOD 403 Forbidden (impersonate chrome insufficient)](https://github.com/yt-dlp/yt-dlp/issues/16012)
- [yt-dlp Issue #6748 — kick.com videos HTTP 403 (Cloudflare)](https://github.com/yt-dlp/yt-dlp/issues/6748)
- [Kick Terms of Service — anti-scraping / no automated systems clauses](https://kick.com/terms-of-service)
- [Kick Help — Stream Replays (VODs): 7-day / 30-day retention](https://help.kick.com/en/articles/7112432-kick-stream-replays-vods)
- [Kick Help — How to download your Kick VOD (directs to third-party tools)](https://help.kick.com/en/articles/7832538-how-to-download-your-kick-vod)
- [Kick Help — How to create clips (10-180s, 3-min max)](https://help.kick.com/en/articles/7120566-how-to-create-clips-on-kick)
- [Tubefilter — Kick launches $100K API developer fund (Mar 2025)](https://www.tubefilter.com/2025/03/07/kick-launches-api-developer-fund-third-party-streamer-tools/)
- [NetInfluencer — Kick $100K Developer Challenge details/timeline](https://www.netinfluencer.com/kick-launches-100000-usd-developer-challenge-with-new-public-api/)
- [Kick Dev portal (register OAuth apps)](https://dev.kick.com/)
- [Kick VOD Downloader — Chrome extension (in-session record, 15-min segments, .m4v)](https://chromewebstore.google.com/detail/kick-vod-downloader/fpmjccgjphmlembbnnfedpejpdjacail)
- [Chrome for Developers — Manifest V3 service worker lifecycle limits](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [addpipe — Dealing with huge MediaRecorder chunks (413s, chunk-size spikes)](https://blog.addpipe.com/dealing-with-huge-mediarecorder-slices/)
