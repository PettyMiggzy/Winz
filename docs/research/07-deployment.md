# Research: deployment

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

Vercel (as of Aug 2026) defaults to Node 24.x, with Node 22.x supported and Node 20.x being disabled for new deployments on Oct 1, 2026 (upstream Node 20 hit EOL April 30, 2026). Vercel Fluid compute now allows 800s (GA) / 1800s (beta) durations, 4GB RAM max, and even Docker containers (beta, June 2026), but the 4.5MB request body limit, ~500MB /tmp, 2-vCPU ceiling, and stateless model make it wrong for the download→Whisper→FFmpeg→upload worker — use Vercel only for the dashboard/API/webhooks. The heavy worker is best on a cheap always-on box: Hetzner CX33 (4 vCPU/8GB, €8.49–$9.99/mo after the June 2026 price hike) or Fly/Railway/Render/DO at $13–85/mo; GPU is unnecessary for faster-whisper small/base (or skip local Whisper entirely — Groq whisper-large-v3-turbo is $0.04/audio-hour). Store clips in Cloudflare R2 ($0.015/GB-mo, zero egress, 10GB free) which pairs perfectly with Instagram's requirement that Reels be fetched from a public video_url; run jobs with BullMQ+Redis (or pg-boss/SQLite if avoiding Redis) with exponential backoff and idempotency keys for social uploads.

## Key facts

- Vercel supported Node.js versions (docs, updated 2026-02-27): 24.x (default), 22.x, 20.x. Node 24 became GA on Vercel Nov 25, 2025 and is the default for new projects (currently pinned to 24.11.x line).
- Node 20 on Vercel: upstream EOL April 30, 2026; Vercel changelog (published July 14, 2026) says Node 20 is disabled in Project Settings on October 1, 2026 — new deployments with Node 20 will error; already-deployed functions keep running.
- Node.js 24 'Krypton': released May 6, 2025; promoted to Active LTS Oct 28, 2025 (v24.11.0); maintenance until ~April 2028. Node 22 is Maintenance LTS until April 30, 2027. Node 26 released May 5, 2026 (Current).
- Vercel Fluid compute limits (docs, updated 2026-07-01): max duration Hobby 300s; Pro/Enterprise 300s default, 800s max (GA), 1800s extended max (beta, per-function config). Memory: Hobby 2GB/1vCPU; Pro/Ent up to 4GB/2vCPU. Request/response body hard cap: 4.5MB (413 FUNCTION_PAYLOAD_TOO_LARGE). Bundle: 250MB uncompressed (Large Functions beta: up to 5GB). /tmp scratch ~500MB. 1,024 file descriptors shared.
- Vercel Container Images (beta since ~June 30, 2026): deploy any OCI image via Dockerfile.vercel — ffmpeg/system libs explicitly supported — but still stateless HTTP functions with the same function limits, scale-to-zero after 5 min idle, Active CPU pricing. No long-lived worker processes.
- Worker hosting (Aug 2026): Hetzner CX33 4vCPU/8GB = €8.49/$9.99/mo (post June-15-2026 price increase; CPX line jumped 35-157%, e.g. CPX32 now $41.99); Contabo 4vCPU/8GB ≈ $7-11/mo; DigitalOcean Basic 4GB/2vCPU $18-24/mo, 8GB/4vCPU $48/mo (per-second billing since Jan 2026); Fly.io shared-cpu-2x/4GB $13.27/mo, shared-cpu-4x/8GB $47.32/mo; Render Standard 2GB $25/mo, Pro 4GB $85/mo; Railway usage-based $10/GB-RAM-mo + $20/vCPU-mo ($5/mo Hobby minimum).
- Fly.io GPUs are deprecated as of July 31, 2026 — not an option anymore.
- GPU is NOT needed for Whisper at this scale: faster-whisper small/base with int8 on 4 CPU threads runs well above realtime (~5-10x for small, ~20x for tiny/base); a 30-min VOD transcribes in roughly 3-8 min on a 4-vCPU VPS. Hosted alternative: Groq whisper-large-v3-turbo $0.04/audio-hour (~$0.02 per 30-min VOD), OpenAI whisper-1 $0.006/min ($0.36/hr), gpt-4o-mini-transcribe ~$0.003/min, Deepgram Nova-3 ~$0.26/hr.
- Cloudflare R2: $0.015/GB-mo storage, Class A $4.50/M writes, Class B $0.36/M reads, ZERO egress fees; free tier 10GB-mo + 1M Class A + 10M Class B per month. S3 Standard is ~$0.023/GB-mo plus ~$0.09/GB egress after the 100GB/mo free allowance.
- Instagram Graph API Reels publishing requires a PUBLICLY accessible HTTPS video_url — Meta's servers download the file (no direct upload in the standard container flow): POST /{ig-user-id}/media (media_type=REELS, video_url), poll container status_code until FINISHED, then POST /{ig-user-id}/media_publish. R2's free egress + public bucket/custom domain fits this exactly.
- Job queue consensus 2026: BullMQ (Redis) is the default Node choice (~500K weekly downloads) with built-in retries/exponential backoff, rate limiting, delayed + repeatable (cron) jobs; pg-boss is the top pick if you already run Postgres (SKIP LOCKED, no Redis); a hand-rolled SQLite queue is workable for a single-box solo project but you re-implement retry/backoff/locking yourself.
- Node 22→24 changes relevant to this stack: V8 13.6, npm 11, Undici 7 fetch (test social-API upload code), global URLPattern, AsyncLocalStorage on AsyncContextFrame by default, url.parse() runtime-deprecated, legacy fs.F_OK/R_OK/W_OK/X_OK removed, assert.CallTracker removed — and native addons (better-sqlite3, sharp) must be rebuilt for the new ABI.

## Gotchas

- If the project is on Node 20 today: it has had no upstream security patches since April 30, 2026, and Vercel blocks new Node 20 deployments on October 1, 2026 — upgrade to 24.x before then.
- Vercel's 4.5MB request/response body limit is a hard cap on all plans — VODs and rendered clips can never pass through a function body; use presigned direct uploads and URL-pull flows.
- Vercel /tmp is only ~500MB and the filesystem is otherwise read-only — a 30-min 1080p VOD plus rendered clips can overflow it mid-job; this figure is Lambda-derived and not in the current limits table, so verify before relying on it.
- Vercel's 1800s (30-min) max duration is still BETA (Pro/Ent only, per-function config, specific runtime versions, incompatible with Secure Compute/Static IPs); Hobby is hard-capped at 300s.
- Vercel Container Images (Dockerfile.vercel) let you ship ffmpeg, but they are still stateless scale-to-zero HTTP functions with the same duration/memory limits — they do not turn Vercel into a worker host.
- Fly.io GPUs were deprecated July 31, 2026 — any 2024-2025 blog post recommending Fly for GPU Whisper is stale.
- Hetzner raised prices effective June 15, 2026: the CPX (AMD/US) line jumped 35-157% (CPX32 4c/8GB now $41.99/mo) — older articles citing $15-18 CPX31 are stale; CX plans (Germany/Finland only) remain the deal, and US Hetzner locations no longer have a cheap tier.
- CX32 is a deprecated/legacy Hetzner plan — new orders should use CX33; also note Hetzner charges extra for IPv4 and prices exclude VAT.
- Contabo's low price comes with well-documented performance variability and slower support — acceptable for a batch worker, risky for latency-sensitive services.
- Instagram Reels API: video_url must be publicly reachable at fetch time (Meta downloads it; no direct upload in the standard container flow), containers must be polled until FINISHED before media_publish, and accounts have a rolling 24-hour API publishing cap (~50 posts — verify the current number in Meta docs before designing throughput).
- Instagram/Meta fetching each clip means egress per post — on S3 that is $0.09/GB after the 100GB/mo free allowance; R2's zero egress eliminates this cost entirely.
- R2 free tier applies to Standard class only; Infrequent Access adds $0.01/GB retrieval fees and a 30-day minimum billing period — wrong class for short-lived clips.
- BullMQ requires Redis with maxmemory-policy=noeviction; if Redis evicts keys under memory pressure, jobs are silently lost.
- Node 22→24 bumps the native-addon ABI: better-sqlite3, sharp, and other prebuilt .node modules must be upgraded/rebuilt, and Undici 7 changes fetch/HTTP behavior worth retesting against social upload endpoints.
- Railway's per-GB/per-vCPU pricing is cheap for bursty workloads but an always-hot 8GB/4vCPU worker costs ~$160/mo — far more than a $10 Hetzner box.
- Whisper benchmarks are hardware- and version-dependent; the realtime factors cited (small/int8 several-x realtime on 4 vCPU) should be validated on the actual instance type before committing to CPU-only transcription of 30-min VODs.
- Vercel changelog dates and beta statuses (Large Functions, 1800s duration, Container Images) are actively evolving in 2026 — recheck vercel.com/changelog before launch.

## Full details

# Where to run a VOD→Whisper→FFmpeg→social pipeline (research as of 2026-08-15)

## 1. Vercel Node.js runtime status (Aug 2026)

Source: [vercel.com/docs/functions/runtimes/node-js/node-js-versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) (last_updated 2026-02-27):

- Available versions: **24.x (default)**, **22.x**, **20.x**. Node 18 is gone entirely.
- New projects get the latest LTS available on Vercel → **Node 24 is the default**, currently running 24.11.x. Only major versions selectable; Vercel auto-applies minor/patch.
- Override via Project Settings → Build and Deployment → Node.js Version, or `"engines": { "node": "24.x" }` in `package.json` (package.json wins over dashboard).

Exact dates from Vercel changelog:
- **Nov 25, 2025** — "Node.js 24 LTS is now generally available for builds and functions"; made **default for new projects** (V8 13.6, global URLPattern, Undici 7, npm 11).
- **Jul 14, 2026** — "Node.js 20 is being deprecated": Node 20 hit upstream **EOL April 30, 2026**; on **October 1, 2026** Node 20 is disabled in Project Settings and **new deployments pinned to 20 fail** (existing deployments keep serving). Vercel's suggested escape hatch for stragglers is container images.
- **Jan 14, 2026** — Vercel Sandbox also defaults to Node 24.

**Answer for the user:** Node 20 is effectively dead (upstream EOL since April 2026, Vercel cutoff Oct 1, 2026). Node 22 works but is Maintenance LTS. **Target Node 24 (`"engines": {"node": "24.x"}`)** — it is Vercel's default and Active LTS upstream.

## 2. Vercel limits & viability for the video worker

Source: [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) (updated 2026-07-01), Fluid compute is default for new projects:

| Limit | Value |
|---|---|
| Max duration | Default 300s all plans. Hobby max **300s**. Pro/Ent max **800s (GA)**, **1800s extended max (beta**, per-function config, specific Node/Python runtime versions only, incompatible with Secure Compute/Static IPs) |
| Memory/CPU | Hobby: 2GB/1vCPU fixed. Pro/Ent: 2GB default → **4GB/2vCPU max** |
| Request/response body | **4.5MB hard cap** (413 `FUNCTION_PAYLOAD_TOO_LARGE`) — cannot be raised; bypass = client uploads direct to storage (presigned URL) |
| Bundle size | 250MB uncompressed (AWS-enforced); **Large Functions beta: up to 5GB** (needs Fluid + Active CPU; env var `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` for existing projects) |
| /tmp | ~**500MB** writable scratch, read-only FS otherwise (long-standing Lambda-derived figure; not in the current limits table — treat as approximate) |
| File descriptors | 1,024 shared across concurrent executions |
| Billing | Active CPU time + provisioned memory time (I/O wait ≈ free) |

**FFmpeg on Vercel:** two routes both *technically* work now:
1. Bundle a static ffmpeg binary (~60-80MB) inside the 250MB function or use the 5GB Large Functions beta.
2. **Container Images (beta, announced ~June 30, 2026)** — `Dockerfile.vercel` at repo root, OCI image built to Vercel Container Registry, served as a Function. Vercel's own KB lists "apps requiring system libraries (FFmpeg, Chromium)" as a use case. BUT: still stateless per-request functions, HTTP server on `$PORT`, scale-to-zero after 5 min idle in production, same function duration/memory limits, Active CPU pricing, no Secure Compute/Static IPs.

For truly unlimited duration Vercel points to **Vercel Workflows** (pause/resume, durable state) — but each step still executes inside function limits, so it orchestrates rather than removes the compute ceiling.

**Verdict:** Vercel is the wrong home for the worker. The killer constraints for a 5-30 min VOD pipeline:
- 4.5MB body cap → the VOD can never pass *through* a function; everything must be URL-pull or presigned-upload.
- ~500MB /tmp → a 30-min 1080p VOD (0.3-1.5GB) + rendered clips can overflow scratch space.
- 2 vCPU max → Whisper small on 2 vCPU for 30 min of audio plus ffmpeg renders will flirt with even the 800s cap; 1800s is beta and Hobby is capped at 300s.
- No GPU, no persistent process, no resumable local state between steps.

**Use Vercel for:** Next.js dashboard, REST API, OAuth callbacks from social platforms, webhook receivers, cron triggers (enqueue only), status polling UI. That part fits perfectly on Hobby/Pro with Node 24.

## 3. Homes for the heavy worker (Aug 2026 pricing)

| Provider | Spec | Price | Notes |
|---|---|---|---|
| **Hetzner Cloud CX33** | 4 shared vCPU / 8GB / 80GB NVMe / 20TB traffic | **€8.49 ≈ $9.99/mo** (post-hike) | Best $/perf. Prices rose **June 15, 2026**: CX23 (2c/4GB) €5.49/$6.49; CX43 €15.99/$18.49. **Avoid the CPX (AMD) line** — hiked 35-157% (CPX32 4c/8GB now $41.99). CX only in Germany/Finland; US regions (Ashburn/Hillsboro) only have the now-expensive CPX. |
| **Contabo Cloud VPS** | 4 vCPU / 8GB / 200GB SSD / 32TB | **~$6.99-11.31/mo** (varies w/ term/promo) | Cheapest raw specs; known for variable/oversold performance — fine for a tolerant batch worker. |
| **DigitalOcean Basic** | 4GB/2vCPU; 8GB/4vCPU | **$18-24/mo; $48/mo** | Per-second billing since Jan 2026 (monthly cap at 672h). Polished, pricier than Hetzner. Has GPU Droplets if ever needed. |
| **Fly.io** | shared-cpu-2x/4GB; shared-cpu-4x/8GB; performance-1x/2GB | **$13.27; $47.32; $32.19/mo** (region-dependent, per-second billing) | Machines scale to zero → great for a bursty worker (only pay while processing). Volumes $0.15/GB-mo, egress NA/EU $0.02/GB. **Fly GPUs deprecated July 31, 2026** — off the table. |
| **Render** | Starter 512MB $7; Standard 2GB/1CPU $25; Pro 4GB/2CPU **$85/mo** | Background Workers priced like web services + $0 Hobby workspace | Easiest DX, worst $/GB at the 4-8GB tier. |
| **Railway** | Usage-based: **$10/GB-RAM-mo + $20/vCPU-mo**, billed per-minute on actual usage; $5/mo Hobby minimum (includes $5 credit); volumes $0.25/GB-mo; egress $0.10/GB | A worker that idles at 300MB and bursts to 4GB/2vCPU a few hours/day lands ~$10-25/mo; an always-hot 8GB/4vCPU service ≈ $160/mo — good for bursty, bad for pinned-heavy. |

**GPU question:** Not needed. faster-whisper `small` with `compute_type="int8"` on 4 CPU threads runs multiple-x realtime (community benchmarks: small/int8 transcribes ~13 min audio in ~1m42s on an i7-12700K; ~20x realtime for tiny; comfortably 4-8x realtime for small on a 4-vCPU VPS). A 30-min VOD ⇒ roughly 4-8 min of CPU transcription — fine for an async queue. `base` is faster still; only large-v3 locally would justify GPU, and the cheaper 2026 answer there is an API:
- **Groq whisper-large-v3-turbo: $0.04/audio-hour** (≈$0.02 per 30-min VOD, ~200x realtime)
- OpenAI `whisper-1`: $0.006/min ($0.36/hr); `gpt-4o-mini-transcribe`: ~$0.003/min
- Deepgram Nova-3 batch: ~$0.26/hr
For a solo dev on a Node stack this also removes the Python/CTranslate2 sidecar entirely.

**Recommended shape:** Hetzner CX33 ($10/mo, 20TB traffic) or Fly machine (scale-to-zero) running a Docker image with Node 24 + ffmpeg + yt-dlp (+ optionally faster-whisper); Vercel hosts the dashboard/API.

## 4. Job architecture (solo-dev, 2026)

- **BullMQ + Redis** remains the Node default (~500K weekly downloads): priorities, delayed jobs, **built-in retries with exponential backoff** (`{ attempts: 5, backoff: { type: 'exponential', delay: 30_000 } }`), rate limiting (useful against social API quotas), repeatable/cron jobs, flows (parent-child: transcribe → render N clips → post N uploads). Cost of admission: a Redis instance — trivial if it's `redis:7` in the same docker-compose on the VPS (Redis must run `maxmemory-policy noeviction`). Managed options: Upstash/Redis Cloud free tiers cover this volume.
- **pg-boss (v10+)** if the app already has Postgres (e.g., Neon/Supabase behind the Vercel dashboard): `FOR UPDATE SKIP LOCKED`-based, retries/backoff/cron included, one less moving part. 2026 guides consistently recommend it under ~hundreds of jobs/min.
- **SQLite/simple table + cron loop**: perfectly serviceable for one worker on one box at this volume (a few dozen jobs/day), but you hand-roll retry counters, backoff timestamps, stuck-job recovery (visibility timeout/heartbeat), and concurrency locks — BullMQ/pg-boss give all of that for free, so the 2026 consensus is: don't DIY unless you enjoy it. (If SQLite: `better-sqlite3` is a native addon — needs a Node-24-compatible release/rebuild.)
- **Long-running job patterns** for this pipeline: one queue per stage (`download`, `transcribe`, `render`, `publish`) so failures retry only the failed stage; job-level timeout > worst case (set ~20-30 min for a 30-min VOD); stalled-job detection via BullMQ's lock renewal; **idempotency keys on the publish stage** (store platform container/media IDs before confirming) so a retry never double-posts; artifacts passed between stages by R2 key, never in the job payload.
- Trigger options: Vercel Cron hits an API route that enqueues; or the worker long-polls its own queue.

## 5. Storage for clips

**Cloudflare R2** ([developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/)):
- Standard: **$0.015/GB-mo**; Class A (PutObject/CreateMultipartUpload) **$4.50/M**; Class B (GetObject) **$0.36/M**; **egress: $0 — free**.
- Free tier (Standard only): **10GB-mo storage, 1M Class A, 10M Class B per month** — a clips pipeline (say 50 clips/day × 50MB, deleted after 7 days ≈ 17GB-mo) costs ≈ $0.11/mo.
- Infrequent Access: $0.01/GB-mo but +$0.01/GB retrieval and 30-day minimum — wrong class for short-lived clips.
- S3-compatible API → works with `@aws-sdk/client-s3` in Node; lifecycle rules can auto-delete clips after N days.

**Why R2 specifically:** the **Instagram Graph API Reels flow requires a public HTTPS `video_url`** — Meta's servers download the file (`POST /{ig-user-id}/media` with `media_type=REELS` + `video_url` → poll `/{container-id}?fields=status_code` until `FINISHED` → `POST /{ig-user-id}/media_publish` with `creation_id`). Every post = one full-file egress (×re-fetches, ×other platforms that pull URLs). On S3 that's $0.09/GB after the 100GB/mo free allowance; on R2 it's $0. Serve via a public bucket on a custom domain or r2.dev; presigned GET URLs also work if long-lived enough for Meta's fetch + processing window.

S3 Standard for comparison: ~$0.023/GB-mo + request fees + $0.09/GB egress — only worth it if already deep in AWS.

## 6. Node 24 specifics

- Released **May 6, 2025**; **Active LTS Oct 28, 2025** (v24.11.0 'Krypton') — so yes, "became LTS Oct 2025" is correct. Active LTS window runs to ~Oct 2026, then Maintenance until **April 2028**. Node 22 'Jod' is Maintenance LTS until **April 30, 2027**. Node 26 (Current) released May 5, 2026.
- 22→24 items that matter for this stack:
  - **Undici 7 / new fetch** — retest any `fetch`-based social-API upload code (multipart, HTTP/2 behavior, connection handling changed).
  - **Native addon ABI bump** — `better-sqlite3`, `sharp`, anything with prebuilt `.node` binaries must be upgraded/rebuilt (`npm rebuild`) for Node 24.
  - `url.parse()` runtime-deprecated (use WHATWG `URL`); `fs.F_OK/R_OK/W_OK/X_OK` removed (use `fs.constants.*`); `assert.CallTracker` removed; `SlowBuffer`/`tls.createSecurePair` gone; `dirent.path` removed.
  - Niceties: global `URLPattern`, `Error.isError`, `Float16Array`, npm 11, AsyncLocalStorage on AsyncContextFrame (faster), simplified `--permission` flag, localStorage/sessionStorage globals, and native TypeScript type-stripping runs `.ts` files directly (erasable syntax only; also backported on by default to 22.18+).
  - `require(esm)` works (already unflagged in 22.12+, stable in 24) — eases CJS/ESM pain with modern SDKs.

## Bottom-line architecture recommendation

- **Vercel (Node 24)**: Next.js dashboard, API routes, social OAuth, webhooks, Vercel Cron → enqueue jobs. Free/Hobby likely sufficient; Pro ($20/seat) if >300s API work or team features needed.
- **Worker**: Docker (node:24-bookworm + ffmpeg + yt-dlp) on **Hetzner CX33** (€8.49/$9.99/mo, 4vCPU/8GB, 20TB) — or Fly.io machines if scale-to-zero economics appeal ($13-47/mo class), or Railway for zero-ops bursty usage.
- **Transcription**: Groq whisper-large-v3-turbo API ($0.04/hr) first choice for a Node-only stack; faster-whisper small/int8 on the VPS CPU if data must stay local. No GPU.
- **Queue**: BullMQ + Redis (same box or Upstash) — exponential backoff retries and rate limiting out of the box; pg-boss if a Postgres already exists.
- **Clips**: R2 with lifecycle deletion; public custom-domain URLs satisfy Instagram's `video_url` fetch at $0 egress.

## Sources

- [Vercel docs — Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel changelog — Node.js 20 is being deprecated on October 1, 2026](https://vercel.com/changelog/node-js-20-is-being-deprecated)
- [Vercel changelog — Node.js 24 LTS generally available for builds and functions](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions)
- [Vercel docs — Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- [Vercel changelog — Bring your Dockerfile to Vercel Functions](https://vercel.com/changelog/bring-your-dockerfile-to-vercel-functions)
- [Vercel KB — Does Vercel support Docker deployments?](https://vercel.com/kb/guide/does-vercel-support-docker-deployments)
- [Vercel changelog — Vercel Functions can now run up to 30 minutes](https://vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes)
- [Fly.io — Resource Pricing](https://fly.io/docs/about/pricing/)
- [Fly.io community — GPUs deprecated as of July 31, 2026](https://community.fly.io/t/gpu-migration-fly-io-gpus-will-be-deprecated-as-of-july-31-2026/27110)
- [Railway docs — Pricing Plans](https://docs.railway.com/pricing/plans.md)
- [Hetzner Docs — Price Adjustment 15 June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [DigitalOcean — Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [Cloudflare R2 — Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Meta Developer Docs — Instagram Platform Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [endoflife.date — Node.js release schedule](https://endoflife.date/nodejs)
- [Node.js — v24.11.0 'Krypton' (LTS) release, 2025-10-28](https://nodejs.org/en/blog/release/v24.11.0)
- [Node.js — v24.0.0 release notes (breaking changes)](https://nodejs.org/en/blog/release/v24.0.0)
- [faster-whisper (PyPI) — CPU int8 benchmarks](https://pypi.org/project/faster-whisper/)
- [Modal blog — Choosing between Whisper variants](https://modal.com/blog/choosing-whisper-variants)
- [CloudZero — Groq pricing 2026 (Whisper v3 Turbo $0.04/hr)](https://www.cloudzero.com/blog/groq-pricing/)
- [PkgPulse — BullMQ vs Bee-Queue vs pg-boss 2026](https://www.pkgpulse.com/guides/bullmq-vs-bee-queue-vs-pg-boss-job-queues-nodejs-2026)
- [Render pricing explained (workspace fee + compute)](https://livemy.app/blog/render-pricing)
- [BestUSAVPS — Contabo VPS pricing 2026](https://bestusavps.com/reviews/contabo/)
