# WinClipz — Deploy & Flip It On

The whole system, end to end. Two things run; they share a database and a bucket.

```
   Browser ─▶ Vercel (Next.js: dashboard + API)
                 │  presigned upload
                 ▼
             Cloudflare R2  ◀── worker fetches the source
                 ▲                         │
                 │ QUEUED stream           ▼
             Postgres  ◀────────  Worker (your server: FFmpeg + engine)
                                     writes clips ▶ dashboard shows them
```

- **Web** (Vercel): the site, dashboard, and API. No FFmpeg, no heavy work.
- **Worker** (a cheap always-on box): polls Postgres for `QUEUED` streams,
  downloads the video from R2, runs the clip engine, writes clips back.
- **Postgres** is also the job queue (no Redis needed).

Rough cost: **Vercel free · Neon Postgres free · R2 ~$0–1/mo · a $5–10/mo worker
box · Groq ~$0.02 per 30-min video.**

---

## 1. Postgres (Neon — free)

1. Create a project at [neon.tech](https://neon.tech), copy the connection
   string (`postgresql://…`).
2. Locally, create the schema:
   ```bash
   # repo root
   echo "DATABASE_URL=postgresql://…" >> .env.local
   npm install
   npm run db:push        # creates all tables from prisma/schema.prisma
   ```

## 2. Cloudflare R2 (storage)

1. Cloudflare dashboard → **R2** → create a bucket, e.g. `winclipz`.
2. **R2 → Manage API Tokens** → create a token with Object Read & Write. Note
   the **Account ID**, **Access Key ID**, **Secret**.
3. Give the bucket a public URL so the worker (and Instagram) can fetch clips:
   bucket → **Settings → Public access** → enable an `r2.dev` URL *or* connect a
   custom domain. That URL is `R2_PUBLIC_BASE_URL`.

## 3. Groq (transcription + LLM, free tier)

Create a key at [console.groq.com](https://console.groq.com) → `GROQ_API_KEY`.
(The engine uses it for Whisper *and* the scoring model. To use a different
OpenAI-compatible model, set `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`.)

## 4. Deploy the web app (Vercel)

Already connected — just add environment variables (Project → Settings →
Environment Variables) and redeploy:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Neon string |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL (e.g. `https://winclipz.vercel.app`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | from step 2 |
| `R2_PUBLIC_BASE_URL` | the public bucket URL |

Once these are set, the dashboard reads the real database and uploads go
straight to R2.

## 5. Deploy the worker (Railway or Render — the box with FFmpeg)

The worker is a Docker image (FFmpeg baked in). On **Railway** or **Render**:

1. New project → deploy from this GitHub repo.
2. Point it at **`worker/Dockerfile`** with **build context = repo root**
   (Railway: set the Dockerfile path; Render: "Docker" env, root dir `.`,
   Dockerfile `worker/Dockerfile`).
3. Environment variables:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | same Neon string as the web app |
   | `GROQ_API_KEY` | from step 3 |
   | `WORK_DIR` | `/tmp/winclipz` (default) |

That's it — no exposed port (it's a background poller, not a web service).
On boot it logs `polling for QUEUED streams…`.

> **Self-host alternative:** any $5–10/mo VPS with Docker:
> `docker build -f worker/Dockerfile -t winclipz-worker . && docker run -d --env-file worker/.env winclipz-worker`.
> Or bare: install `ffmpeg`, `cd worker && npm install && npm start`.

## 6. First end-to-end test (uses Winslow's YouTube back-catalog)

1. In **YouTube Studio**, download one of WinslowBankz's videos (MP4).
2. Open the dashboard → **Upload** → drop the file → **Clip it**.
3. It uploads to R2 and the stream goes `QUEUED`. The worker claims it, and in a
   few minutes clips appear in **Review queue** with titles + captions.
4. Watch the worker logs — you'll see `transcribe → signals → score → render → done`.

If clips show up, the machine works. 🎬

## 7. Turn on posting (OAuth — later, needs registered apps)

Posting to TikTok/Instagram needs registered developer apps + (for TikTok) the
content-posting audit. When ready:

- **TikTok**: create an app at developers.tiktok.com, add
  `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET`/`TIKTOK_REDIRECT_URI`
  (`https://<app>/api/auth/tiktok/callback`). **File the Content Posting audit
  early** — until it passes, API posts are private-only.
- **Instagram**: create a Meta app (Instagram Login), add
  `INSTAGRAM_CLIENT_ID`/`SECRET`/`REDIRECT_URI`. For your own accounts, Standard
  Access is enough.
- **Shortcut**: route TikTok/YouTube posting through **Blotato** ($29/mo, already
  audited) while your own audits process. YouTube already works — post Shorts to
  WinslowBankz directly.

Until then, the **Connect** buttons redirect to setup instead of erroring, and
you can approve clips in the review queue and post them by hand.

---

## Verify checklist

- [ ] `npm run db:push` created the tables (Neon).
- [ ] Web deploy has DATABASE_URL + R2_* → `/api/health` shows `"database":"configured"`.
- [ ] Worker box is up and logging `polling for QUEUED streams…`.
- [ ] An uploaded video produces clips in the review queue.

> The upload → worker → clips path hasn't been run in CI (no FFmpeg/DB in the
> build sandbox). Do the step-6 test on first deploy and check the worker logs;
> ping me with any error and I'll fix it fast.
