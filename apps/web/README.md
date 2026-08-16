# Winz — Web (marketing site + dashboard)

The Next.js front end for Winz: the public marketing site, legal pages, auth
screens, and the creator dashboard (currently running on mock data).

- **Framework:** Next.js 15 (App Router) · React 19 · TypeScript
- **Styling:** Tailwind CSS 3, dark-first design system in `src/app/globals.css`
- **Node:** 24 LTS recommended (works on ≥20.9)

## Run locally

```bash
cd apps/web
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production build
```

## Deploy

### Vercel (recommended for the front end)

This app is a perfect fit for Vercel. Two ways to do it:

1. **Import the repo** at vercel.com → New Project.
2. **Set the Root Directory to `apps/web`** (Project → Settings → General →
   Root Directory). Vercel auto-detects Next.js from there — no other config.
3. Set the Node.js version to **24.x** (Settings → General → Node.js Version).

That's it. Every push to the branch redeploys.

> **Why Vercel for this and not the video worker:** Vercel is ideal for the
> dashboard, marketing site, and (later) the Kick webhook receiver. It is *not*
> suitable for the heavy clip pipeline — downloading VODs, running Whisper, and
> rendering with FFmpeg — because of its request-body cap, small `/tmp`, and
> stateless functions. That worker belongs on your own server / a VPS. See
> `../../ARCHITECTURE.md` and `../../docs/STRATEGY.md`.

### Self-hosting on your own server (alternative)

Next.js runs anywhere Node does:

```bash
npm run build
PORT=3000 npm start          # behind nginx/caddy as a reverse proxy
```

or containerize with a standard Node 24 Dockerfile. You lose Vercel's
zero-config CDN/image optimization but gain full control. If you're already
running the video worker on your server, co-hosting the front end there is
reasonable — just put it behind a proper reverse proxy with TLS.

## Structure

```
src/
├── app/
│   ├── page.tsx              # landing page
│   ├── login, signup/        # auth (stubbed → link to dashboard)
│   ├── privacy, terms/       # legal (draft — review with counsel)
│   └── dashboard/            # overview, review, clips, accounts, analytics, settings
├── components/
│   ├── Logo, Icons, ClipPhone, PlatformBadge
│   ├── marketing/            # Nav, Footer, AuthShell, LegalDoc
│   ├── dashboard/            # Sidebar, Topbar, StatCard, ReviewQueue, ...
│   └── ui/Reveal
└── lib/mock.ts               # illustrative data — swap for real API in Phase 1
```

## Brand assets

`public/generated/` holds the brand art (hero/OG backgrounds, glow orbs,
texture) generated with Venice AI. To regenerate or add assets, use the Venice
API key stored in the repo-root `.env` (never commit it). The key is only
needed to *generate* assets — the deployed site serves them as static files and
does not need the key at runtime.

## Backend (wired)

The app now has a real backend layer that runs with **zero config** (seed
fallback) and becomes fully live when you add a database + Kick credentials.

### Data layer
- `prisma/schema.prisma` — the multi-tenant data model (Tenant, User,
  SocialAccount, Stream, Clip, Post, WebhookEvent). Source of truth.
- `src/server/db.ts` — lazy Prisma client; only connects when `DATABASE_URL` is set.
- `src/server/store.ts` — the single data-access layer every page/route uses.
  Reads Prisma when a DB is configured, otherwise serves seed data.

Enable the database:
```bash
# set DATABASE_URL in .env.local (Postgres — Neon/Supabase/your own)
npm run db:push      # create the schema
```

### API routes
| Route | What it does |
|-------|--------------|
| `GET /api/health` | Liveness + reports DB/Kick config state |
| `POST /api/webhooks/kick` | Kick event receiver — **verifies RSA-SHA256 signature**, dedupes by message id, reacts to `livestream.status.updated` (stream-end trigger) |
| `POST /api/clips/[id]/decision` | Approve/skip a clip (persists when DB is set) |
| `GET /api/auth/kick/start` | Begins Kick OAuth 2.1 (PKCE, CSRF state in httpOnly cookies) |
| `GET /api/auth/kick/callback` | Validates state, exchanges code for tokens |

`src/lib/kick.ts` holds the Kick integration (OAuth URLs, PKCE, token exchange,
app tokens, and webhook signature verification). The signature logic is unit
tested — `npm test` (5 checks, real RSA keypair).

### What's still stubbed
- **The clip pipeline itself** (capture → transcribe → detect → render → post)
  runs on the worker, not here — that's the next build, and it lives on your
  server, not Vercel. The webhook's stream-end handler currently logs where the
  job would enqueue.
- **TikTok/YouTube/Instagram OAuth** — only Kick's flow is wired so far.
- **Auth/sessions** — the dashboard resolves a single demo tenant for now.

## Notes

- Legal pages are working drafts to unblock development and platform review —
  have a lawyer review before public launch.
- Secrets live in `.env.local` (gitignored). The Venice key stays at the repo
  root `.env`. The deployed site needs no secrets to render (seed fallback).
