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
broadcaster's `livestream.status.updated` events. When a stream ends:

1. The webhook matches `broadcaster.user_id` to a connected SocialAccount —
   this, not the signature, is what proves the event belongs to a workspace
   (Kick signs every app's webhooks with one global key).
2. The newest VOD is resolved via Kick's v2 videos endpoint (undocumented; the
   same one yt-dlp targets — treated as best-effort, never fatal).
3. A QUEUED Stream is created under the workspace's monthly quota; the worker
   downloads the VOD with yt-dlp (through the residential proxy) and clips it.

If the VOD isn't published yet the event is skipped — the creator can still
paste the link manually. Requires the Kick app's webhook URL to point at
`https://<app>/api/webhooks/kick`.

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
