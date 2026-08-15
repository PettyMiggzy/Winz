# Research: kick-api

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Kick's official public API (api.kick.com, docs at docs.kick.com) is real and stable in Aug 2026: OAuth 2.1 apps created at kick.com/settings/developer (2FA required), 11 scopes, channels/livestreams/categories/chat/moderation endpoints, and 10 webhook event types including livestream.status.updated (fires with is_live=false + ended_at when a stream ends) — the clean way to detect "stream just ended" for WinslowBankz. However, the official API still has NO VOD/videos endpoints, so VOD listing/downloading must use the unofficial Cloudflare-protected endpoints kick.com/api/v2/channels/{slug}/videos and kick.com/api/v1/video/{uuid} (returns the stream.kick.com IVS master.m3u8), which yt-dlp and streamlink both support provided curl_cffi browser impersonation is installed. VOD chat replay IS retrievable via the undocumented GET kick.com/api/v2/channels/{channel_id}/messages?start_time={ISO8601}, which is what Kick's own player uses — sufficient for chat-velocity highlight detection.

## Key facts

- Official API base: https://api.kick.com/public/v1 (and /public/v2/livestreams); OAuth server: https://id.kick.com (/oauth/authorize, /oauth/token, /oauth/token/introspect, /oauth/revoke); apps created at kick.com/settings/developer, 2FA mandatory; docs at docs.kick.com (KickEngineering/KickDevDocs on GitHub).
- OAuth 2.1: authorization_code + PKCE (S256 required) for user tokens; client_credentials for app tokens (no refresh token); access tokens expire ~3600s; refresh tokens became reusable/flexible on 2025-11-25 per docs changelog.
- 11 scopes: user:read, channel:read, channel:write, channel:rewards:read, channel:rewards:write, chat:write, streamkey:read, events:subscribe, moderation:ban, moderation:chat_message:manage, kicks:read.
- Webhook event livestream.status.updated v1 fires on stream start AND end — payload has is_live (bool), started_at, ended_at (null while live), title, broadcaster{user_id, channel_slug,...}. This is the official 'stream just ended' signal. Subscribe via POST https://api.kick.com/public/v1/events/subscriptions with an app token + broadcaster_user_id (get the ID from GET /public/v1/channels?slug=winslowbankz).
- Webhook delivery: signed with RSA-SHA256 over 'messageId.timestamp.rawBody'; headers Kick-Event-Signature, Kick-Event-Message-Id (ULID), Kick-Event-Message-Timestamp, Kick-Event-Type, Kick-Event-Version; public key at GET https://api.kick.com/public/v1/public-key; 3 retries; auto-unsubscribe after >1 day of continuous failures; caps: 10,000 subscriptions per event type per app (1,000 for chat.message.sent on unverified apps).
- Official API has NO VOD/videos endpoints as of Aug 2026 (still an open feature request in KickDevDocs). VOD listing is unofficial: GET https://kick.com/api/v2/channels/{slug}/videos (optionally ?cursor=0&sort=date&time=all) and .../videos/latest; single VOD: GET https://kick.com/api/v1/video/{uuid} whose 'source' field is the master playlist https://stream.kick.com/ivs/v1/196233775518/{stream_id}/{yyyy}/{MM}/{dd}/{HH}/{mm}/{uuid}/media/hls/master.m3u8 (AWS IVS; the CDN itself is not Cloudflare-challenged).
- yt-dlp supports Kick VODs (URL form https://kick.com/{channel}/videos/{uuid}), live (kick.com/{channel}) and clips (kick.com/{channel}/clips/clip_...); its extractor calls kick.com/api/v1/video/{id} with impersonate=True, so curl_cffi must be installed (pip install 'yt-dlp[default,curl-cffi]'); a Feb 2026 403 wave (issue #16012) was fixed in release 2026.02.21 (PR #16018 'Deprioritize unreliable impersonate targets'). Streamlink also has a Kick plugin (live, /video/{id}, /{channel}/videos/{id}, clips).
- Cloudflare on kick.com/api/*: plain requests/httpx/curl get 403 via JA3/JA4 TLS fingerprinting. Working 2025-2026 approach: curl_cffi with impersonate='chrome124' (rotate chrome131/safari17_0), ~98% success; cloudscraper ~72% and degrading; Playwright+stealth works but 3-8s/page; keep <~100 req/10s per IP, sleep 0.5-1s between calls, 60s backoff on 429.
- VOD chat replay EXISTS (unofficial): GET https://kick.com/api/v2/channels/{numeric_channel_id}/messages?start_time={ISO8601} returns {status:{code:200}, data:{messages:[...], cursor}} — the endpoint Kick's own VOD player uses (chat replay shipped Aug 2023). Tools iterate start_time from livestream.start_time in +N-second steps to reconstruct the full chat timeline (e.g. yui-915/kick-chat-downloader). A newer variant lives at web.kick.com/api/v2/channels/{id}/messages?cursor=... and web.kick.com/api/v1/chat/{channelId}/history.
- Live chat capture without any auth: Pusher WebSocket wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false, subscribe channel 'chatrooms.{chatroom_id}.v2' (chatroom_id from kick.com/api/v2/channels/{slug} → chatroom.id); main event 'App\Events\ChatMessageEvent'. Officially, chat.message.sent webhook (events:subscribe scope) delivers live chat too.
- Maintained libraries (2026): KickLib C# v1.10.0 (2026-01-31, official+unofficial API+Pusher), @retconned/kick-js v0.5.4 (npm, ~Oct 2025), kickpython 0.1.5 (2025-02-28), betterKickAPI (Python, official API+webhooks), Enmn/KickApi (Python, unofficial incl. videos+chat replay), glichtv/kick-sdk (Go, official API), juliogarciape/kick-dl (CLI), dknos/kick-save (Windows exe: VODs/clips/live/chat).
- Channel WinslowBankz could not be verified from this sandbox (kick.com/api/v2/channels/winslowbankz returns Cloudflare 403 to non-browser clients; the official GET /public/v1/channels?slug= requires an app token). Web search only surfaces the rapper Winslow Bankz (Edgewood, TX) — slug 'winslowbankz' should be confirmed with one authenticated official-API call.

## Gotchas

- The official api.kick.com has NO VOD/videos endpoints (Aug 2026) — any VOD automation must rely on undocumented kick.com/api/v1|v2 endpoints that Kick can change or fence off without notice (they already tightened things in Feb 2026, breaking yt-dlp until 2026.02.21).
- Plain requests/curl against kick.com/api/* always 403: Cloudflare fingerprints TLS (JA3/JA4), so header spoofing alone never works — you need curl_cffi/curl-impersonate (impersonate='chrome124' etc.), cloudscraper (degrading), or a real browser; scraping kick.com may also violate Kick's ToS — weigh account/IP ban risk and prefer official endpoints where possible.
- yt-dlp silently degrades without curl_cffi installed ('impersonation not available' → 403); some official builds (linux_aarch64) don't bundle it. Sub-only VODs 403 without browser cookies.
- Kick webhooks auto-unsubscribe your app after >1 day of failed deliveries (and retry only 3 times per event) — you must monitor and re-subscribe, or you'll silently miss stream-end events.
- Official REST rate limits are not published (only 429 semantics); webhook caps: 10k subscriptions per event type, 1k for chat.message.sent on unverified apps. Unofficial side: ~100 req/10s/IP Cloudflare threshold, 60s backoff on 429 or risk temp bans.
- The chat-replay endpoint (api/v2/channels/{id}/messages?start_time=) takes the NUMERIC channel id, not the slug, and is undocumented — several vendor blogs wrongly claim Kick has no past-chat access; verify behavior before building on it, and dedupe messages when stepping start_time.
- App access tokens (client_credentials) have no refresh token and expire ~1 hour — re-mint on schedule; PKCE S256 is mandatory on the user flow; redirect URI must use 'localhost' not '127.0.0.1' (NextJS rewrite bug).
- v1 official endpoints (GET /public/v1/livestreams, v1 categories) are deprecated in favor of v2 (cursor pagination, limit up to 1000) — new code should target v2.
- Could not verify that the channel 'winslowbankz' exists on Kick from this environment (Cloudflare 403; official lookup needs an app token) — confirm the slug with GET /public/v1/channels?slug=winslowbankz before wiring webhooks.
- Kick's Pusher app key (32cbd69e4b950bf97679, cluster us2) is unofficial infrastructure — it has been stable for years but could rotate; also live-chat capture only works while the stream is live, so run it as a daemon if you want a redundant chat archive.

## Full details

# Kick.com API & VOD Automation Research (Aug 2026) — for channel `winslowbankz`

## 1. Official public API (dev.kick.com → docs.kick.com)

**State (Aug 2026):** Live and actively developed (docs repo: `KickEngineering/KickDevDocs`; changelog notes as recent as 2025-11-25 — "refresh tokens now reusable/flexible"). Base URLs:
- API: `https://api.kick.com/public/v1/...` (+ `public/v2` for livestreams/categories)
- OAuth: `https://id.kick.com`

**App setup:** `kick.com/settings/developer` → requires 2FA enabled on the account; you register a redirect URI and receive `client_id` + `client_secret`. No formal review documented; a "verified app" tier exists and raises the `chat.message.sent` webhook subscription cap.

**OAuth 2.1:**
- User tokens: `GET https://id.kick.com/oauth/authorize?client_id=...&response_type=code&redirect_uri=...&scope=...&state=...&code_challenge=...&code_challenge_method=S256` → `POST https://id.kick.com/oauth/token` (form-urlencoded, `grant_type=authorization_code`, includes `code_verifier`). PKCE is mandatory.
- App tokens (server-to-server, ideal for public-data automation): `POST https://id.kick.com/oauth/token` with `grant_type=client_credentials&client_id=...&client_secret=...` → `{access_token, token_type, expires_in}` (no refresh token; re-mint on expiry, ~3600s).
- Refresh: `grant_type=refresh_token`. Introspect: `POST /oauth/token/introspect` (Bearer header). Revoke: `POST /oauth/revoke`.
- Local-dev quirk: use `localhost` not `127.0.0.1` in redirect URIs (NextJS rewrite bug; or add a sacrificial query param).

**Scopes (11):** `user:read`, `channel:read`, `channel:write`, `channel:rewards:read`, `channel:rewards:write`, `chat:write`, `streamkey:read`, `events:subscribe`, `moderation:ban`, `moderation:chat_message:manage`, `kicks:read`.

**Key endpoints:**
- `GET /public/v1/channels?slug=winslowbankz` (up to 50 slugs ≤25 chars, or `broadcaster_user_id` up to 50; no params = the authed user). Returns `broadcaster_user_id`, `slug`, `stream_title`, `channel_description`, `banner_picture`, subscriber counts, `category{id,name,thumbnail}`, `stream{is_live, is_mature, viewer_count, start_time, url, key, language, thumbnail, custom_tags}`. App token or `channel:read`. **This is how you resolve the numeric `broadcaster_user_id` for webhooks.**
- `PATCH /public/v1/channels` (user token, `channel:write`) — update `stream_title`, `category_id`, `custom_tags` (≤10).
- `GET /public/v2/livestreams` — current v2: `category_id[]` (≤25), `language_code[]` (BCP-47, ≤25), `limit` 1–1000 (default 100), `cursor`; sorted oldest→newest. `GET /public/v1/livestreams` (deprecated): `broadcaster_user_id[]` ≤50, `sort=viewer_count|started_at`, `limit` ≤100.
- `GET /public/v1/users/livestreams?user_id=...` (≤100 IDs) — returns only *active* livestreams for those users (absence ⇒ offline; a usable polling fallback).
- `GET /public/v1/livestreams/stats` → `{total_count}`.
- Categories (`/public/v2/categories` with cursor pagination; v1 deprecated), Users, Chat (`POST /public/v1/chat` to send as bot/user), Moderation (`POST /public/v1/moderation/bans`), Channel rewards, `GET /public/v1/kicks/leaderboard`, `GET /public/v1/public-key`.
- **Rate limits: not publicly documented** — only 429 semantics; the docs currently specify no fixed quota numbers for REST calls.

## 2. Webhooks / detecting "stream just ended"

10 event types (all v1): `chat.message.sent`, `channel.followed`, `channel.subscription.renewal`, `channel.subscription.gifts`, `channel.subscription.new`, `channel.reward.redemption.updated`, **`livestream.status.updated`**, `livestream.metadata.updated`, `moderation.banned`, `kicks.gifted`.

**`livestream.status.updated`** fires on both start and end. Payload: `broadcaster{user_id, username, is_verified, profile_picture, channel_slug}`, `is_live`, `title`, `started_at`, `ended_at` (null while live, populated at end). So "stream just ended" = webhook with `is_live:false` / non-null `ended_at`.

**Subscription flow for WinslowBankz:**
1. Mint app token (client_credentials).
2. `GET /public/v1/channels?slug=winslowbankz` → `broadcaster_user_id`.
3. `POST https://api.kick.com/public/v1/events/subscriptions` body: `{"broadcaster_user_id": <id>, "method": "webhook", "events": [{"name": "livestream.status.updated", "version": 1}]}`. (With a user token + `events:subscribe` scope, broadcaster is inferred and no ID is needed. `GET`/`DELETE` on the same path list/remove subscriptions.)
4. Your public HTTPS endpoint receives events with headers `Kick-Event-Type`, `Kick-Event-Version`, `Kick-Event-Message-Id` (ULID, idempotency key), `Kick-Event-Message-Timestamp` (RFC3339), `Kick-Event-Signature` (Base64 RSA-SHA256 over `messageId.timestamp.rawBody`; verify with the PEM key from `GET /public/v1/public-key`, also hardcoded in docs).
5. Reliability: 3 retries per event; if your endpoint keeps failing **for over a day Kick auto-unsubscribes** — re-subscribe logic is required. Caps: 10,000 subs/event-type/app; 1,000 for `chat.message.sent` on unverified apps.
6. No WebSocket transport for official events yet (open request, KickDevDocs issue #20/#64) — webhook only. Polling fallback: `GET /public/v1/channels?slug=` and check `stream.is_live` transition true→false.

## 3. VOD access (list + download)

**Official API: no VOD endpoints exist (Aug 2026).** A `/public/v1/videos` endpoint is a long-standing open feature request (KickDevDocs, e.g. issue #125 asks even for a video/livestream ID linkage). Everything below is the *unofficial* website API on `kick.com` (Cloudflare-protected, see §4):

- **List a channel's VODs:** `GET https://kick.com/api/v2/channels/{slug}/videos` — optional `?cursor=0&sort=date&time=all` (used by kick-dl). Items include `session_title`, `start_time`, `duration` (seconds or ms depending on field), `views`, `thumbnail`, `live_stream_id`, and nested `video{uuid,...}`; the UUID builds the watch URL `https://kick.com/{slug}/videos/{uuid}`. Also `GET .../videos/latest` for the newest VOD.
- **Single VOD → playback URL:** `GET https://kick.com/api/v1/video/{uuid}` → field **`source`** = master playlist: `https://stream.kick.com/ivs/v1/196233775518/{stream_id}/{yyyy}/{MM}/{dd}/{HH}/{mm}/{uuid}/media/hls/master.m3u8` (AWS IVS account `196233775518` is fixed; some tools even reconstruct this URL from the VOD thumbnail path). The `stream.kick.com` CDN is CloudFront/IVS and is **not** behind the Cloudflare challenge, so once you hold the m3u8 URL, ffmpeg/any HLS client works.
- Related: `GET kick.com/api/v2/channels/{slug}` (live `playback_url`, `chatroom.id`, `user_id`, `id`), `GET kick.com/api/v2/channels/{slug}/livestream`, `GET kick.com/api/v1/channels/{slug}` (includes `previous_livestreams`), clips: `api/v2/channels/{slug}/clips`, `api/v2/clips/{clip}/play`.

**yt-dlp:** yes, Kick is supported (KickVOD/KickIE/KickClip extractors).
- VOD regex: `kick\.com/[\w-]+/videos/{uuid}`; live: `kick\.com/{channel}`; clips: `/clips/clip_...` — API calls: `api/v2/channels/{channel}` (live), `api/v1/video/{video_id}` (VOD, reads `source`), `api/v2/clips/{id}/play`.
- All Kick API requests are made with `impersonate=True` ⇒ **curl_cffi is required** (`pip install "yt-dlp[default,curl-cffi]"`); official single-exe builds bundle it except some (e.g. linux_aarch64, issue #14106). Without it: "Impersonate target ... is not available" / 403.
- Feb 2026 breakage: issue #16012 (403 on VOD metadata, stable@2026.02.04) fixed by PR #16018 ("[rh:curl_cffi] Deprioritize unreliable impersonate targets"), released in **yt-dlp 2026.02.21** — keep yt-dlp current.
- Sub-only VODs 403 without auth (issue #13442) — pass `--cookies-from-browser`; extractor forwards a Bearer token from cookies when present.
- Command: `yt-dlp --impersonate chrome "https://kick.com/winslowbankz/videos/<uuid>"` (impersonation is automatic when curl_cffi is present).
- **Streamlink** also ships a Kick plugin (live `kick.com/{channel}`, VOD `kick.com/video/{id}` or `kick.com/{channel}/videos/{id}`, clips) using the same unofficial endpoints.

## 4. Cloudflare on unofficial endpoints (2025–2026 practice)

- kick.com uses Cloudflare bot management: JA3/JA4 TLS fingerprinting, JS challenges, occasional Turnstile. Plain `requests`/`httpx`/vanilla curl → immediate 403 regardless of headers.
- **Standard solution: curl_cffi / curl-impersonate.** `from curl_cffi import requests; requests.get("https://kick.com/api/v2/channels/winslowbankz", impersonate="chrome124")` — rotate profiles (`chrome124`, `chrome131`, `safari17_0`); ~98% success reported (roundproxies, 2026). Node equivalent: curl-impersonate binaries; Go: tls-client-style libraries.
- cloudscraper still ~72% but degrading; Playwright + playwright-stealth works for rendered pages but costs 3–8 s/page and 200–400 MB RAM — use only for cookie (cf_clearance) harvesting or logins.
- Operational limits: Cloudflare default ~100 req/10 s/IP; keep 0.5–1 s between calls; on 429 back off 60 s (immediate retries → temp bans); residential proxy rotation (20–50 IPs) for high volume.
- Two surfaces bypass Cloudflare entirely: the **Pusher WebSocket** (chat) and **stream.kick.com** HLS CDN. The **official api.kick.com is not bot-protected at all** — prefer it wherever it covers your need.
- Newer web/mobile host `web.kick.com/api/v1|v2/...` mirrors some endpoints (`/api/v1/livestreams`, `/api/v1/chat/{channelId}/history`, `/api/v2/channels/{id}/messages`) and is used by recent tools (KickNoSub, Kickstra). Same protection class applies.

## 5. Chat: replay for VODs + live capture

**VOD chat replay — yes, it exists (unofficial).** Kick shipped "Chat replay on VODs and Clips" in Aug 2023. The player fetches:
```
GET https://kick.com/api/v2/channels/{numeric_channel_id}/messages?start_time={ISO8601}
→ { "status": {"code":200}, "data": { "messages":[ {id, chatroom_id, content, type, created_at, sender{id, username, slug, identity{color, badges}}}, ... ], "cursor": ... } }
```
For a full-VOD chat dump for chat-velocity analysis: take `livestream.start_time` (+ the VOD `duration`) from `api/v2/channels/{slug}/videos`, then loop `start_time = start + k·N seconds` until the end, dedupe by message `id` (this is exactly what `yui-915/kick-chat-downloader` and `donnaken15/radect` do; `Enmn/KickApi` exposes it as `.chat(channel_id, datetime)`). Note: **numeric channel id, not slug** (get it from `api/v2/channels/{slug}` → `id`). Cursor-paginated variant: `GET https://web.kick.com/api/v2/channels/{channelId}/messages?cursor=...`. Same Cloudflare handling as §4 applies. (Several vendor blogs claim "Kick has no past-chat API" — that is incorrect/marketing; the endpoint above powers Kick's own replay UI. Caveat: it's undocumented and could change without notice.)

**Live chat capture (for archiving during the stream):**
- Pusher WS (no auth for public chat): `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false`; subscribe `{"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.{chatroom_id}.v2"}}` (chatroom_id = `chatroom.id` from `api/v2/channels/{slug}`); events arrive as `App\Events\ChatMessageEvent` (plus subscription/gift/pin events); respond to `pusher:ping` with `pusher:pong` (~30 s heartbeat). App key `32cbd69e4b950bf97679` has been stable for years and is used by Moblin, NOALBS, kick-js, etc.
- Official route: subscribe webhook `chat.message.sent` (needs `events:subscribe`; payload has `message_id`, `content`, `created_at`, `sender.identity` badges/color, `emotes` with positions) — 1,000-channel cap unverified.

## 6. Community libraries (maintenance as of Aug 2026)

- **KickLib (C#, Bukk94)** — most actively maintained: NuGet 1.10.0, updated **2026-01-31**; covers official API (OAuth URL generation, token exchange/refresh), unofficial endpoints, and Pusher websocket.
- **@retconned/kick-js (TypeScript/npm)** — v0.5.4, last publish ~Oct 2025; chat read via Pusher + authenticated actions (send message via `api/v2/messages/send/{chatroomId}`, uses tokens/cookies).
- **kickpython (PyPI)** — 0.1.5, 2025-02-28; API wrapper + own websocket implementation.
- **betterKickAPI (PyPI)** — Python 3.9+; official API + webhook helper (modeled on twitchAPI).
- **Enmn/KickApi (Python)** — unofficial endpoints incl. `channels/{slug}/videos` and the chat-replay `messages?start_time=` call.
- **glichtv/kick-sdk (Go)** — official public API + events. **kick-api (Rust crate)** — websocket chat.
- Downloader tools: **yt-dlp** (§3), **streamlink** plugin, **juliogarciape/kick-dl** (CLI, VODs+clips), **dknos/kick-save** (Windows exe: VODs/clips/live/chat capture), **jonathanhecl/kick-vod-downloader**, **mortyobnoxious/kickvod-extractor** (m3u8 reconstruction), **TheNestorHD/BetterKick** (browser extension), **kicklet.app/chat-downloader** (web VOD-chat exporter), **yui-915/kick-chat-downloader** (TwitchDownloader-compatible CSV/JSON chat replay).
- cibere/kick.py and fb-sean/kick-website-endpoints are useful *endpoint references* though not actively developed.

## Recommended architecture for WinslowBankz automation

1. Register Kick app (2FA on account) → client_credentials app token (cache ~1 h).
2. `GET /public/v1/channels?slug=winslowbankz` → `broadcaster_user_id` (also confirms the slug — unverifiable from this sandbox; kick.com/api 403s to non-browser clients and web search only shows the rapper "Winslow Bankz", Edgewood TX).
3. Subscribe `livestream.status.updated` webhook; verify RSA signatures; treat `is_live:false`/`ended_at` as trigger; keep a resubscribe cron (auto-unsubscribe after 1 day of failures).
4. On stream end, wait a few minutes for VOD publish, then via curl_cffi (`impersonate="chrome124"`) call `kick.com/api/v2/channels/winslowbankz/videos`, match by `live_stream_id`/`start_time`, grab `video.uuid`.
5. Download with up-to-date yt-dlp (+curl_cffi) using `https://kick.com/winslowbankz/videos/{uuid}`, or fetch `api/v1/video/{uuid}` → `source` m3u8 → ffmpeg.
6. For chat-velocity highlights: dump replay chat via `api/v2/channels/{id}/messages?start_time=...` loop (or belt-and-suspenders: archive live chat via Pusher `chatrooms.{chatroom_id}.v2` during the stream, which needs no Cloudflare workaround at all).

## Sources

- [Kick Dev Docs (official)](https://docs.kick.com/)
- [Kick Docs — OAuth 2.1 token flow](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow)
- [Kick Docs — Scopes](https://docs.kick.com/getting-started/scopes)
- [Kick Docs — Kick apps setup](https://docs.kick.com/getting-started/kick-apps-setup)
- [Kick Docs — Event types (webhooks)](https://docs.kick.com/events/event-types)
- [Kick Docs — Subscribe to events](https://docs.kick.com/events/subscribe-to-events)
- [Kick Docs — Webhook security](https://docs.kick.com/events/webhook-security)
- [Kick Docs — Channels API](https://docs.kick.com/apis/channels)
- [Kick Docs — Livestreams API](https://docs.kick.com/apis/livestreams)
- [KickEngineering/KickDevDocs (GitHub)](https://github.com/KickEngineering/KickDevDocs)
- [yt-dlp Kick extractor source](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/kick.py)
- [yt-dlp issue #16012 — Kick VOD 403 (Feb 2026)](https://github.com/yt-dlp/yt-dlp/issues/16012)
- [yt-dlp PR #16018 — curl_cffi impersonate fix](https://github.com/yt-dlp/yt-dlp/pull/16018)
- [yt-dlp issue #13442 — sub-only VODs](https://github.com/yt-dlp/yt-dlp/issues/13442)
- [Streamlink Kick plugin](https://github.com/streamlink/streamlink/blob/master/src/streamlink/plugins/kick.py)
- [Roundproxies — 6 Ways to Scrape Kick.com in 2026 (Cloudflare workarounds)](https://roundproxies.com/blog/scrape-kick-com/)
- [repostit.io — Kick API Guide: OAuth 2.1, v1/v2 endpoints](https://repostit.io/kick-api-guide/)
- [fb-sean/kick-website-endpoints (unofficial endpoint list)](https://github.com/fb-sean/kick-website-endpoints)
- [yui-915/kick-chat-downloader (VOD chat replay via messages?start_time=)](https://github.com/yui-915/kick-chat-downloader)
- [Enmn/KickApi (Python unofficial API incl. videos + chat replay)](https://github.com/Enmn/KickApi)
- [mortyobnoxious/kickvod-extractor (master m3u8 reconstruction)](https://github.com/mortyobnoxious/kickvod-extractor)
- [Bukk94/KickLib (C#, maintained 2026)](https://github.com/Bukk94/KickLib)
- [KickLib on NuGet (v1.10.0, 2026-01-31)](https://www.nuget.org/packages/KickLib/)
- [@retconned/kick-js (npm)](https://www.npmjs.com/package/@retconned/kick-js)
- [kickpython (PyPI)](https://pypi.org/project/kickpython/)
- [betterKickAPI (PyPI)](https://pypi.org/project/betterKickAPI/)
- [glichtv/kick-sdk (Go, official API)](https://pkg.go.dev/github.com/glichtv/kick-sdk)
- [juliogarciape/kick-dl (VOD/clip CLI)](https://github.com/juliogarciape/kick-dl)
- [dknos/kick-save (VOD/clip/live/chat downloader)](https://github.com/dknos/kick-save)
- [KICK on X — chat replay on VODs announcement](https://x.com/KickStreaming/status/1686369966549856256)
- [Kick Help Center — How to download your Kick VOD](https://help.kick.com/en/articles/7832538-how-to-download-your-kick-vod)
- [Kicklet — Kick Chat Downloader](https://kicklet.app/chat-downloader)
