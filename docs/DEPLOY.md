# WinClipz — Deploy & Operations

The system in production. Two things run; they share a database and a bucket.

```
   Browser ─▶ Vercel (Next.js: site + dashboard + API + auth)
                 │  presigned upload / link submit
                 ▼
             Cloudflare R2  ◀── worker fetches sources, writes clips
                 ▲                         │
                 │ QUEUED stream           ▼
             Postgres  ◀────────  Worker(s) (FFmpeg + yt-dlp + engine)
                (Neon)               clip poller + publish poller
```

- **Web** (Vercel): marketing site, dashboard, auth, REST API. No heavy work.
- **Worker** (Railway and/or any Docker box): polls Postgres for `QUEUED`
  streams, downloads the video (direct or yt-dlp via proxy), runs the clip
  engine, uploads clips to R2. A second poller posts approved clips.
- **Postgres is the queue** (no Redis). Multiple workers can run at once —
  jobs are claimed atomically; stale claims auto-requeue after 2h.
- **Schema is self-provisioning**: the worker creates all tables and applies
  idempotent micro-migrations at boot. No manual `db push` needed.

## Environment variables

### Web (Vercel)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres (pooled string is fine) |
| `NEXT_PUBLIC_APP_URL` | canonical site URL |
| `ADMIN_EMAILS` | comma-separated emails that claim the founding workspace as ADMIN on signup |
| `R2_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET` `R2_PUBLIC_BASE_URL` | Cloudflare R2 storage |
| `TIKTOK_CLIENT_KEY` `TIKTOK_CLIENT_SECRET` `TIKTOK_REDIRECT_URI` | own TikTok app (Login Kit); sandbox creds until approved |
| `KICK_CLIENT_ID` `KICK_CLIENT_SECRET` `KICK_REDIRECT_URI` | Kick app — enables auto-clipping every stream |
| `TIKTOK_SCOPES` | optional override; must match scopes enabled on the app/sandbox |
| `INSTAGRAM_CLIENT_ID` `INSTAGRAM_CLIENT_SECRET` `INSTAGRAM_REDIRECT_URI` | Meta app (Instagram Login), when configured |

### Worker (Railway variables / DO `worker/.env`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | same Neon database as the web app |
| `GROQ_API_KEY` | Whisper transcription + LLM scoring |
| `R2_*` (all five) | same values as the web app — worker uploads clips |
| `YTDLP_PROXY` | residential proxy (`http://user:pass@host:port`) — required for YouTube links |
| `YTDLP_COOKIES_B64` | optional: base64 cookies.txt, extra YouTube reliability |
| `TIKTOK_CLIENT_KEY` `TIKTOK_CLIENT_SECRET` | in-house TikTok posting (accounts connected on the site) |
| `TIKTOK_POST_MODE` | `direct` (default; sandbox/audited) or `draft` (works unaudited) |
| `UPLOADPOST_API_KEY` | vendor posting bridge (researched pick, $16/mo) — TikTok/IG/YT via their approved app |
| `BLOTATO_API_KEY` | fallback vendor bridge |
| `AUDD_API_KEY` | optional music fingerprinting gate |
| `ELEVENLABS_API_KEY` | clip translation (dubbing in the creator's own voice) |
| `KICK_PUSHER_KEY` `KICK_PUSHER_CLUSTER` | optional overrides for Kick's public chat socket — set only if Kick rotates them |

Boot logs confess the config: `database host: …`, `R2: configured/NOT
CONFIGURED`, and which posting providers are active. Read them after every
deploy.

## Auth & workspaces

- Email+password auth; sessions in Postgres (30-day HttpOnly cookie).
- Signup requires agreeing to the ToS (enforced client + server side).
- Each signup creates an isolated workspace (plan `FREE`). Emails in
  `ADMIN_EMAILS` attach to the founding WinslowBankz workspace as `ADMIN`.
- All dashboard pages and APIs are scoped to the session's workspace.
- No `DATABASE_URL` → demo mode: open dashboard with seed data, no auth.

## Kick auto-clipping (zero-touch)

Connect a Kick channel in Dashboard → Accounts and WinClipz subscribes to that
broadcaster's `livestream.status.updated` events. Requires the Kick app's
webhook URL to point at `https://<app>/api/webhooks/kick`.

**Stream starts** → the webhook opens a `ChatCapture` and the worker's chat
recorder picks it up within seconds (see below).

**Stream ends** →

1. The webhook matches `broadcaster.user_id` to a connected SocialAccount —
   this, not the signature, is what proves the event belongs to a workspace
   (Kick signs every app's webhooks with one global key).
2. The open `ChatCapture` is closed and attached to the new Stream.
3. A QUEUED Stream is created under the workspace's monthly quota with
   `sourceUrl = kick-latest:<slug>` — a placeholder, not a URL.
4. The worker resolves the real VOD through the residential proxy, then
   downloads and clips it.

VOD resolution lives in the worker on purpose: kick.com's VOD list is
Cloudflare-fronted and **403s datacenter IPs**, so resolving it from Vercel
silently returned nothing. The worker also retries — Kick publishes a VOD
minutes after the stream ends, so "not there yet" is the normal first answer.
It re-checks every 5 minutes for up to 3 hours (via `Stream.notBefore`, and
without spending a retry attempt), then gives up.

## Chat velocity (the signal competitors don't have)

OpusClip, Vizard and Klap score on speech density — they were built for
podcasts, so on a stream they find the streamer *talking*, not the moment chat
lost its mind. WinClipz records chat while the stream is live and feeds
messages-per-second into clip scoring.

- **Capture:** the worker holds a socket open on Kick's public Pusher endpoint
  (`chatrooms.<id>.v2`) for the whole broadcast, up to 5 channels at once. The
  documented `chat.message.sent` webhook caps unverified apps at 1,000 messages
  — minutes on a busy stream — so the socket is the only option that covers a
  full broadcast.
- **Storage:** per-second counts in minute-sized rows (`ChatBucket`). A 12-hour
  stream is 720 small rows. **No message text or authors are ever stored.**
- **Scoring:** spikes are shifted back ~8s (chat reacts *after* the moment) and
  handed to the LLM alongside audio-energy peaks; they also anchor the
  speech-light fallback, so a wordless gameplay moment still becomes a clip.

**The alignment gate.** Chat offsets are measured from Kick's `started_at` and
assume the VOD starts at the same instant. If that's wrong, every offset is
wrong and the engine gets aimed at the wrong moments — worse than no signal. So
the worker refuses the signal rather than guessing when under 50% of chat falls
inside the video's duration, or fewer than 200 messages were captured. Look for
`chat signal unused — …` in the job log; clips still get cut, just without it.

Chat capture only exists if we were listening. A stream that started before the
workspace connected Kick has no capture, and the Accounts page says so plainly
instead of implying otherwise.

## Clip translation (ElevenLabs)

Approved clips can be re-voiced into other languages *in the creator's own
voice*; each dub becomes its own Clip and flows through review + posting. Set
`ELEVENLABS_API_KEY` on the worker and pick languages in Settings. Dubs run
only on APPROVED originals (never a dub of a dub) and are plan-gated, because
dubbing costs ~$0.30-0.50 per source minute.

## Posting pipeline

Approve a clip → Posts are created for the workspace's connected accounts
(staggered 90–120 min apart, never simultaneous; failed posts can be retried
by re-approving). The worker's publish poller sends each post:

- **TikTok (in-house)**: accounts connected via our own TikTok app post
  through it (`direct` needs sandbox/audit; unaudited production clients can
  only post to private accounts — TikTok's rule, lifts after app review).
- **Vendor bridge**: everything else goes through upload-post/Blotato when a
  key is set.

TikTok approvals require a per-post consent dialog (privacy dropdown with no
default) — that UI is part of the product, don't "optimize" it away; it's a
TikTok compliance requirement.

### Post confirmation

Uploading bytes is not publishing. TikTok processes asynchronously and can
still reject a post (format, duration, frame rate, spam risk, revoked auth), so
a post goes `POSTING` -> `PROCESSING` -> `POSTED`/`FAILED`:

- `PROCESSING` means TikTok has the file and hasn't committed. The worker polls
  `post/publish/status/fetch` about once a minute (TikTok caps it at 30/min per
  user token) and writes down the answer.
- On success it stores the real watch URL, so the Posts page links straight to
  the live video. Private and inbox (draft-mode) posts are successes too — they
  just have no public id, so there's no link to give.
- On rejection the post is FAILED **with TikTok's own reason** on `Post.error`,
  shown in the dashboard. "Failed" with no reason is the top complaint against
  every competitor.
- Never confirmed within 30 minutes -> FAILED. An uninterpretable status is
  never treated as success.

`PROCESSING` is deliberately outside the stale-claim reaper's window —
requeueing one would post the clip twice.

## Music screening

Clips cut from a stream carry whatever the streamer was playing, and posting
that to a creator's TikTok or Reels account is how they collect mutes and
strikes. Each rendered clip is fingerprinted against AudD.

Set `AUDD_API_KEY` on the worker. Boot logs say which mode you're in:

```
[winclipz-worker] music screening: on (AudD)
[winclipz-worker] music screening: OFF — set AUDD_API_KEY. …
```

- A 25-second, 44.1 kHz mono MP3 sample is sent (AudD's standard endpoint caps
  at 10 MB; the mp4 itself would often exceed it).
- A hit stores the track on `Clip.musicTrack` and shows it in the review queue —
  "Drake — Hotline Bling", not a bare "music flagged", so the creator can judge
  the risk.
- `MUSIC_POLICY=skip` drops flagged clips instead. The default is to flag,
  because nothing auto-posts without human approval anyway.

**Unchecked is not clean.** No API key, a quota error, a bad token, a timeout,
or a match AudD can't name all return `checked: false`, which is stored on
`Clip.musicChecked` and rendered as **"not screened"** in the review queue. A
clip that wasn't screened must never look like one that passed.

Stripping the music stem (Demucs) is not implemented — a flagged clip is a
decision for a person, not something to silently rewrite.

## Developer API (monetizable surface)

Public REST API, keys managed in Dashboard → Settings → API keys (sha256
stored, secret shown once). Docs at `/developers`.

- `POST /api/v1/streams` `{url}` → queue a video (Bearer `wcz_…`)
- `GET /api/v1/streams/:id` → status + clips
- `GET /api/v1/clips` → newest 100 clips

## Runbooks

**Add a worker**: any Docker host —
`git clone … && docker build -f worker/Dockerfile -t winclipz-worker . && docker run -d --restart unless-stopped --env-file worker/.env winclipz-worker`.
Railway: set replicas, or bump CPU/RAM in service Settings for faster renders.

**A video failed**: check worker logs. yt-dlp bot-check → retry (proxy IP
roll); the stream can be requeued by setting its status back to `QUEUED`.
Stale `PROCESSING` jobs auto-requeue after 2h.

**Rotate burned credentials** (were pasted in chats/screens during setup):
Neon DB password, Groq key, DataImpulse proxy password, TikTok client
secret. Rotate in each provider dashboard → update Vercel/Railway/DO envs.

**TikTok app review** (parked until the site is polished): portal draft is
complete (icon, URLs verified, products+scopes, sandbox with target user).
Record the demo (connect → upload → review → consent dialog → post) on
winclipz.net, upload, submit. Approval lifts the private-account restriction
and enables offering TikTok posting to all users through our own app.
