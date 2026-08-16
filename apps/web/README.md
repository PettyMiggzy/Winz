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

## Notes

- This is the **front end only**. Buttons that would hit the backend (connect
  account, approve → post, save settings) are wired to local UI state or links
  for now; real API wiring is Phase 1 backend work.
- Legal pages are working drafts to unblock development and platform review —
  have a lawyer review before public launch.
