# Research: kick-tos-and-capture-architecture

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Kick's own Terms of Service and Developer Agreement both prohibit exactly what the current pipeline does: automated scraping, use of undocumented/non-official endpoints, and circumventing technical protections (which is what curl_cffi TLS-fingerprint impersonation of Cloudflare is). The official API (docs.kick.com) has NO VOD endpoints and NO programmatic clip-creation, so the v2/channels/{slug}/videos and v1/video/{uuid} routes are internal endpoints outside the sanctioned API. However, real-world enforcement to date is overwhelmingly technical (Cloudflare 403/429 blocks, endpoint churn that repeatedly broke yt-dlp in 2025-2026) rather than legal — no notable cease-and-desists against kick-dl, Kicklet, or Streams Charts were found, and those tools operate openly. Legal exposure for a solo operator clipping their OWN public channel is low (CFAA needs an access-gate you lack authorization for; DMCA 1201 needs a copyrighted work behind an access control you don't own — you own your broadcast and Kick holds only a non-exclusive license), but ToS breach (a civil/account-ban matter) is squarely present, and Kick Partners face an EXCLUSIVE content-license clause that can complicate off-platform redistribution. The recommended architecture is to stop touching VOD endpoints entirely: capture the streamer's own broadcast locally via OBS simultaneous recording (highest quality, zero Kick surface), with live-HLS capture and native VOD download as fallbacks.

## Key facts

- Official Kick API (docs.kick.com, api.kick.com, OAuth 2.1 + PKCE) documents ONLY: channels, users, chat, moderation, categories, livestreams (GET /livestreams = current live state only), events/webhooks, public key, and kicks/leaderboard. There is NO VOD download/listing endpoint and NO programmatic clip-create endpoint as of Aug 2026.
- The pipeline's endpoints are UNDOCUMENTED internal routes: GET api/v2/channels/{slug}/videos (and /videos/latest), GET api/v1/video/{uuid}, with the m3u8 served from stream.kick.com (Amazon IVS). Chat history uses GET api/v2/channels/{channelId}/messages. None are covered by the Developer Agreement.
- Kick main ToS prohibits automated 'scraping,' robots/spiders/crawlers/offline-readers, reverse engineering, and circumventing security/content-filter measures; it carves out only a public-search-engine spider exception.
- Kick Developer Agreement (dev.kick.com/terms-of-service) forbids apps used for 'data scraping, fraud, or unauthorised data collection,' forbids attempts to 'exceed or circumvent any limitations on API calls,' tells devs to use 'officially supported API endpoints,' and lets Kick 'revoke developer keys for any reason or no reason, at any time.'
- curl_cffi impersonate=chrome / TLS-fingerprint (JA3/JA4) evasion of Cloudflare is a 'circumvention of a technical limitation' under both the ToS and the Developer Agreement; Cloudflare fingerprints the TLS handshake before it reads the User-Agent.
- Content license split: the GENERAL ToS lets the streamer KEEP ownership of their content and grants Kick a NON-EXCLUSIVE, royalty-free, perpetual, irrevocable, worldwide, sublicensable license — non-exclusive means the streamer may repost their own broadcasts off-platform. The PARTNER Terms grant an EXCLUSIVE, perpetual, irrevocable, transferable, sublicensable license and bar partners from commercially exploiting content except as specified — a materially different, more restrictive regime.
- Platform exclusivity: Kick generally does NOT require streaming exclusivity (xQc's ~$100M deal was explicitly non-exclusive; multistreaming to Twitch/YouTube is allowed) — but a Partner's exclusive CONTENT-license clause is separate from streaming exclusivity and should be checked in the signed contract.
- Enforcement observed is mostly technical: Kick changed VOD URL generation in late 2025 / 2026, breaking yt-dlp with 403 (issue #16012, PR #16018) and 404 (issue #17284); Cloudflare default block threshold cited at ~100 requests / 10s per IP per origin, with repeated 429s escalating to temporary IP bans. No prominent C&D or app-revocation against kick-dl, Kicklet, or Streams Charts surfaced.
- CFAA (post-Van Buren 2021 + hiQ v. LinkedIn): accessing PUBLIC data with no auth gate is generally not 'without authorization'; a public VOD of your own channel is public. Realistic claim from a ToS violation is civil breach-of-contract / account action, not CFAA.
- DMCA 1201: 1201(a)(1) bars circumventing an access-control 'technological measure that effectively controls access to a work' even for lawful purposes and even by the copyright owner; but generic Cloudflare bot-mitigation protects the site, not a specific copyrighted work, and Kick VOD HLS is plain (no Widevine/FairPlay DRM), weakening any 1201 claim. 1201(a)(2) trafficking risk lands on TOOL authors (yt-dlp, curl_cffi), not a private end-user clipping their own stream.
- VOD retention is short and a real reliability constraint: ~7 days for non-verified streamers, ~30 days for verified. Auto-deleted VODs are unrecoverable — so a scrape pipeline that runs post-hoc can miss content the streamer never downloaded.
- Native clip tool exists (10-180s; keyboard 'C' or /clip captures last 30s) and native VOD download from the creator dashboard is fully sanctioned — but neither is automatable through the official API.
- Live chat is only available via the Pusher WebSocket (wss://ws-us2.pusher.com, channel chatroom.{chatroom_id}, event App\Events\ChatMessageEvent); there is no official past-chat / chat-replay REST endpoint, so chat-velocity should be captured live rather than scraped after the fact.

## Gotchas

- The official API will never solve this: as of Aug 2026 there is no VOD endpoint and no programmatic clip-create/list endpoint. Any VOD automation is inherently on undocumented internal routes that Kick can and does change without notice (broke yt-dlp with 403 then 404 across issues #16012 and #17284).
- curl_cffi TLS-fingerprint impersonation is the single most defensible ToS/Agreement violation to point to — it is literally 'circumventing a limitation.' It is also the most fragile: when Cloudflare updates JA3/JA4 detection, every impersonated request fails at once until the Chrome profile is updated.
- Kick can revoke your developer key 'for any reason or no reason, at any time' — so anything built on the official API for live status can be cut off unilaterally.
- VOD retention is only ~7 days (non-verified) / ~30 days (verified) and auto-deleted VODs are unrecoverable — a post-hoc scrape pipeline can silently miss content; capture live instead of relying on VODs persisting.
- Sub-only VODs return 403 and require auth; bypassing that gating (even accidentally) is a far stronger CFAA/1201 argument than pulling public VODs — keep the pipeline strictly to the operator's own, publicly visible content.
- Kick PARTNERS grant an EXCLUSIVE, perpetual, transferable content license and are barred from commercially exploiting content except as specified — this can conflict with off-platform clip distribution even though non-partner streamers keep a non-exclusive license and may repost freely. Check the signed partner agreement before monetizing clips elsewhere.
- There is no official or reliable chat-replay endpoint; the api/v2/channels/{id}/messages route returns only recent live messages. Chat velocity must be captured live via the Pusher WebSocket, or it is lost.
- IP-level rate limiting kicks in around 100 requests / 10 seconds per origin and repeated 429s escalate to temporary bans — naive bulk VOD/chat scraping from one IP will get blocked fast.
- DMCA 1201 trafficking liability (1201(a)(2)) attaches to distributing circumvention tools; if the pipeline is ever packaged and shared as a product that bundles Cloudflare-evasion, the operator moves from low-risk end-user to a much riskier tool distributor.
- Recording your own OBS scene locally is the only path with genuinely zero Kick-side technical or ToS surface; every path that fetches from kick.com/stream.kick.com carries at least the Cloudflare-gated channel-resolution hop.

## Full details

## 1. Is the current pipeline allowed? (ToS / Developer Agreement / Community Guidelines)

**No — it violates Kick's own rules on three independent grounds, even though the operator is clipping their own channel.**

### 1a. The official API has no VOD path, so the endpoints used are outside the sanctioned surface
The public API (docs.kick.com, `api.kick.com`, OAuth 2.1 + PKCE / client-credentials) documents only: **channels, users, chat, moderation, categories, livestreams, events/webhooks, public key, kicks/leaderboard**. `GET /livestreams` returns *current live state only* — it does not return historical VODs or a raw playback m3u8. There is **no VOD listing/download endpoint and no programmatic clip-create endpoint** as of Aug 2026. Kick Support publicly tells devs to "use officially supported API endpoints."

The pipeline instead calls **internal/undocumented routes** (confirmed in the community endpoint list `fb-sean/kick-website-endpoints`):
- `GET api/v2/channels/{slug}/videos` and `.../videos/latest` — VOD list for a channel
- `GET api/v1/video/{uuid}` — single VOD metadata (returns the `source`/playback m3u8 on `stream.kick.com`, which is **Amazon IVS**)
- `GET api/v2/channels/{channelId}/messages` — chat history (recent messages)

These are the private backend the website uses; they are not part of the Developer Agreement's "Kick APIs."

### 1b. Main ToS prohibits automation + circumvention
Kick's Terms of Service prohibit copying/distributing any part of the Service "by any automated or non-automated 'scraping,'" and using any automated system ("robots," "spiders," "offline readers"). It separately prohibits **reverse engineering** and **circumventing security or content-filtering measures**. The only carve-out is a public-search-engine spider exception. Bulk VOD downloading and chat-history scraping fall inside the prohibited-automation language.

### 1c. Developer Agreement (dev.kick.com/terms-of-service) — directly on point
- Prohibits apps used for "**data scraping**, fraud, or **unauthorised data collection**."
- Prohibits attempts to "**exceed or circumvent any limitations on API calls**, or use the API in a manner that constitutes excessive or abusive usage."
- Kick "**may revoke developer keys for any reason or no reason at all, at any time**."

### 1d. Cloudflare TLS-fingerprint evasion is the sharpest problem
`curl_cffi` with `impersonate="chrome124"` makes the outbound **TLS handshake (JA3/JA4) identical to Chrome's** specifically to defeat Cloudflare, which "fingerprints your connection *before* it sees your User-Agent." This is textbook **circumvention of a technical access limitation** — it maps onto the ToS anti-circumvention clause and the Developer Agreement's "circumvent any limitations" clause more cleanly than the scraping itself does.

### 1e. Observed enforcement — mostly technical, not legal
- **Endpoint churn:** Kick "released a feature and it changed how the URLs for VODs are generated" (late 2025 / 2026), breaking yt-dlp with **403** (yt-dlp issue #16012, PR #16018) and then **404** (issue #17284). The `--impersonate chrome` path is required and still intermittently fails.
- **Cloudflare rate blocking:** community-reported threshold ~**100 requests / 10 seconds per IP per origin**; repeated **429s escalate to temporary IP bans**. Mitigations cited: 0.5-1s delays, residential IP pools (20-50 IPs for ~100k req/day).
- **No prominent legal action found** against kick-dl, kick-vod-downloader, Kicklet, or Streams Charts. Streams Charts and Kicklet run public Kick VOD/chat downloaders openly. So the realistic day-to-day enforcement is Cloudflare blocks + endpoints breaking, not lawyers — but that is at Kick's discretion and can change.

## 2. Content ownership — can the streamer re-post their own broadcast off-platform?

**Two different regimes:**

- **General ToS (non-partner):** The streamer **retains ownership** ("your content remains yours"). Kick receives a **non-exclusive**, royalty-free, perpetual, irrevocable, worldwide, sublicensable license to use/reproduce/distribute the content and the streamer's name/voice/likeness. **Non-exclusive is the key word** — the streamer is not contractually barred from re-uploading their own stream to YouTube/TikTok/etc. (Copyright-wise, clipping your own broadcast is your own work.)

- **Partner Terms & Conditions:** grant Kick an **exclusive, perpetual, irrevocable, transferable, sublicensable** license to the IP, surviving termination, with no additional fees for Kick's sub-licensing, and a clause that partners "shall not sell or commercially exploit in any manner any content received from Kick or provided to Kick" except as specified. **"Exclusive" is materially more restrictive** and could conflict with off-platform redistribution or monetized clips. A Kick Partner must check their signed agreement before building a clip-distribution business off-platform.

- **Streaming exclusivity:** Kick generally does **not** require platform exclusivity (xQc's reported ~$100M deal was explicitly *non-exclusive*; multistreaming to Twitch/YouTube is allowed). That is separate from the Partner *content-license* exclusivity above. Individually negotiated contracts can still impose bespoke terms.

## 3. Legal exposure beyond ToS (CFAA / DMCA 1201)

- **CFAA:** After *Van Buren v. United States* (2021) and the *hiQ v. LinkedIn* line, "without authorization / exceeds authorized access" turns on whether information sits behind an access gate you were not permitted to pass — **not** on breaking a use-restriction. A **public VOD of your own channel is public data**; pulling it is unlikely to be a CFAA violation. The credible claim from ToS violation is **civil breach-of-contract / account termination**, not federal computer-fraud. Bypassing **sub-only** gating (403) on *someone else's* content would be a much stronger unauthorized-access argument — avoid that.

- **DMCA 1201:** §1201(a)(1) bars circumventing "a technological measure that effectively controls access to a work" — even for lawful purposes and even by the copyright owner (statute has no owner exemption). Two facts cut the risk down for self-clipping: (1) **generic Cloudflare bot-mitigation protects the website, not a specific copyrighted work**, and TLS-fingerprint spoofing isn't decrypting an access control on the *work* — courts have been reluctant to treat generic anti-bot as a 1201 access control; (2) **Kick VOD HLS is plain (no Widevine/FairPlay DRM)**, so there is no content-scrambling to "circumvent." Kick also holds only a *non-exclusive* license to your broadcast, so it is a weak 1201 plaintiff against you for reaching your own work. The real §1201(a)(2) **trafficking** exposure falls on the authors/distributors of the tools (yt-dlp, curl_cffi), not on a private end-user. **Net: 1201 exposure for a solo operator clipping their own public, non-DRM channel is low; do not generalize this to sub-gated or third-party content.**

## 4. Alternative capture architectures — ranked by risk × reliability

**(A) BEST — Streamer-side local recording (OBS simultaneous record / replay buffer).** OBS records the local scene to disk at the same time it streams (Settings → Output → "Enable Recording"/second output, or the Replay Buffer). **Touches zero Kick endpoints, zero Cloudflare, no ToS surface at all**, and gives **source-quality video before Kick's re-encode** (Kick VODs re-encode to 160p-1080p60 H.264/AAC HLS). A watch-folder on the streamer box uploads finished segments to the worker. Downside: needs the streamer's machine/OBS up and disk/CPU headroom; a crash loses that session — mitigate with the Replay Buffer plus periodic flushing and split-file recording. **This is the recommendation.**

**(B) Live-HLS capture as it airs (streamlink / yt-dlp against the live playlist).** Avoids VOD endpoints entirely; you capture segments from `stream.kick.com` (IVS CDN) during the broadcast. Still requires resolving the live `playback_url` once per stream via the **unofficial** `api/v2/channels/{slug}` or `.../livestream` (Cloudflare-gated → may need one impersonated request), because the official `GET /livestreams` gives live *status/metadata* but not the raw m3u8. So it is **far fewer requests and a much smaller ToS footprint than bulk VOD scraping, but the single channel-info hop is the same gray area**. Reliability: solid while live; breaks if Kick rotates the channel endpoint. Good primary **fallback** when OBS is unavailable. streamlink/ffmpeg `-c copy` remuxes losslessly.

**(C) Streamer's own stream key / restream.** Fan out the streamer's own RTMP (OBS multi-output, Restream, or a self-hosted nginx-rtmp/SRS ingest) to your worker. **Fully authorized (it's the streamer's key), source quality, no Kick endpoints.** More infra to run; blast radius is your own ingest server's uptime. Strong option if you want a clean programmatic feed.

**(D) Native clips + native VOD download.** Kick's native clip tool (10-180s; keyboard `C`, or `/clip` for last 30s) works in the UI for streamer and viewers, and the creator dashboard offers native VOD download — **both fully sanctioned but NOT automatable through the official API** (no clip-create/list or VOD endpoint). Unofficial `api/v2/channels/{slug}/clips` exists for listing but is undocumented/gray. Treat native download as the compliant manual fallback, constrained by retention (**~7 days unverified / ~30 days verified**, unrecoverable after auto-delete).

### Chat-velocity detection
Do it **live**, not by scraping chat-replay. There is **no official past-chat endpoint**; the only clean source is the **Pusher WebSocket** (`wss://ws-us2.pusher.com`, subscribe channel `chatroom.{chatroom_id}`, event `App\Events\ChatMessageEvent`). Getting `chatroom_id` from a slug needs one Cloudflare-gated channel call — or, if you run architecture (A)/(C), you already know your own IDs. Log messages with timestamps during the stream and align spikes to your local recording's clock. This removes the `api/v2/channels/{id}/messages` scraping hop entirely.

## Recommended design (streamer clipping their OWN channel)

1. **Primary capture:** OBS simultaneous local recording (or Replay Buffer) on the streamer's machine → watch-folder → auto-upload to the worker. Source quality, no Kick API, no ToS/Cloudflare surface.
2. **Chat velocity:** subscribe to the Pusher WebSocket live during the broadcast; timestamp-align to the local recording.
3. **Fallback 1:** live-HLS capture with streamlink (resolve `playback_url` once per stream). Fewer requests, smaller ToS footprint than VOD scraping.
4. **Fallback 2:** native dashboard VOD download within the retention window (manual, fully compliant).
5. **Retire as primary:** the curl_cffi + `api/v2/channels/{slug}/videos` + `api/v1/video/{uuid}` VOD-scrape path. Keep it only as an emergency last resort, understanding it is the highest-risk, lowest-reliability component.

### What can break, and blast radius
- **Undocumented VOD endpoints change without notice** (already broke yt-dlp twice in 2025-2026). Blast radius: the entire VOD-scrape path dies until re-reverse-engineered. *Not present in designs A/C.*
- **Cloudflare JA3/JA4 detection updates** outrun curl_cffi's Chrome profile → blanket 403 on every gated fetch (channel info, VOD metadata, chat IDs) at once. Blast radius: all impersonated hops simultaneously. *Design B still has one such hop; A/C have none.*
- **IP rate-ban** (~100 req/10s; 429→temp ban). Blast radius: the scraping worker's IP.
- **Developer-key revocation** — only if you use the OFFICIAL API for live status; Kick can revoke "for any reason." Blast radius: official-API features only.
- **Streamer account action** for automation/circumvention under ToS — low observed probability for self-clipping, high consequence (loss of the channel). This is the core argument for design (A), which never touches a Kick endpoint.
- **Partner exclusive-license clause** — if the streamer is a Kick Partner, off-platform clip redistribution/monetization may conflict with the exclusive content license; check the signed agreement. Blast radius: contractual, potential loss of partner status.

## Sources

- [Kick Terms of Service](https://kick.com/terms-of-service)
- [Kick Terms of Service (ConductAtlas mirror, clause extracts)](https://conductatlas.com/platform/kick/kick-terms-of-service/)
- [KICK Dev - Terms of Service / Developer Agreement](https://dev.kick.com/terms-of-service)
- [Kick Developer Agreement](https://dev.kick.com/terms-and-conditions/)
- [Kick Partner - Terms and Conditions (exclusive content license)](https://kick.com/partner-terms-and-conditions)
- [KickEngineering/KickDevDocs - official Dev API docs](https://github.com/KickEngineering/KickDevDocs)
- [Kick API Guide: OAuth 2.1, v1/v2 Endpoints & Rate Limits](https://repostit.io/kick-api-guide/)
- [fb-sean/kick-website-endpoints - known internal/unofficial endpoints](https://github.com/fb-sean/kick-website-endpoints)
- [yt-dlp issue #16012 - Kick VOD 403 Forbidden (Feb 2026)](https://github.com/yt-dlp/yt-dlp/issues/16012)
- [yt-dlp issue #17284 - Kick VOD 404 after URL-generation change](https://github.com/yt-dlp/yt-dlp/issues/17284)
- [yt-dlp issue #14444 - Kick VOD 403 error](https://github.com/yt-dlp/yt-dlp/issues/14444)
- [6 Ways to Scrape Kick.com in 2026 (endpoints, curl_cffi, Cloudflare, rate limits)](https://roundproxies.com/blog/scrape-kick-com/)
- [KICK VODs (stream replays) - retention windows](https://help.kick.com/en/articles/7112432-kick-vods-stream-replays)
- [How to create clips on KICK (native clip tool)](https://help.kick.com/en/articles/7120566-how-to-create-clips-on-kick)
- [How to download your KICK VOD (native download)](https://help.kick.com/en/articles/7832538-how-to-download-your-kick-vod)
- [Web scraping, website terms and the CFAA: hiQ affirmed under Van Buren (White & Case)](https://www.whitecase.com/insight-our-thinking/web-scraping-website-terms-and-cfaa-hiqs-preliminary-injunction-affirmed-again)
- [Data Scraping: hiQ v. LinkedIn, narrow CFAA interpretation (Jenner & Block)](https://www.jenner.com/en/news-insights/publications/client-alert-data-scraping-in-hiq-v-linkedin-the-ninth-circuit-reaffirms-narrow-interpretation-of-cfaa)
- [DMCA Section 1201 Anti-Circumvention Provisions Explained (LegalClarity)](https://legalclarity.org/dmca-section-1201-anti-circumvention-provisions-explained/)
- [Multistreaming Guide 2026: Twitch, Kick & YouTube Rules (Streams Charts)](https://streamscharts.com/news/multistreaming-guide-2026-rules-explained)
- [Kick Chat Scraper: archive live chat (Pusher WebSocket details)](https://dev.to/devil_scrapes/kick-chat-scraper-archive-live-chat-before-it-disappears-forever-32b3)
- [Streamlink CLI documentation (record HLS with -o)](https://streamlink.github.io/cli.html)
