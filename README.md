# Winz

**A SaaS that grows streamers the way the big Kick creators grew — automatically.**

> Stream ends → AI finds the best moments → renders branded 9:16 clips with
> captions and hooks → distributes them across TikTok, YouTube Shorts, and
> Instagram Reels, each driving viewers back to the streamer's channel.

Free at launch, monthly subscription later. **[Kick.com/WinslowBankz](https://kick.com/WinslowBankz)
is tenant #1 and the live proof** — the machine that grows his channel is the
demo that sells the product.

## Status

**Research phase complete** (Aug 2026). Three deep sweeps done, architecture and
strategy locked, build starting.

- 🧭 **[docs/STRATEGY.md](docs/STRATEGY.md)** — what Winz is, the wedge, unit
  economics, the paperwork critical path, and the build sequence. **Start here.**
- 💡 **[docs/BUSINESS-MODEL.md](docs/BUSINESS-MODEL.md)** — the honest Adin
  Ross / N3on breakdown: where the money really comes from and what transfers
  to a small channel.
- 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)** — the technical system: pipeline,
  stack, costs, compliance guardrails.
- 🔬 **[docs/research/](docs/research/README.md)** — the 29-doc research corpus
  behind every decision (pipeline tech, platform APIs, policy, copyright,
  SaaS gates, business model).
- ✅ **[docs/QUESTIONS-FOR-WINSLOW.md](docs/QUESTIONS-FOR-WINSLOW.md)** — the
  decision sheet gating the build.

## The short version

| Question | Answer |
|---|---|
| Can you do what Adin/N3on do? | The **clip flywheel** yes; the **income** no — their money is gambling sponsorships + Kick subsidy, not clips. Clips are how you *grow*; growth is the product. |
| Is the SaaS buildable? | Yes — Eklipse is the only real competitor and has a ~6-month-copyable lead with a 20–60 min lag, $24.99 price, and reputation gaps. |
| The wedge | Speed (clips in minutes), flat $10–15/mo with Kick in base tier, tri-platform autopilot, own-footage safety. |
| Hardest technical constraint | Kick has **no video API** — ingestion must be user-initiated (extension / upload / paste URL), which is also the legally safe path. |
| Hardest *overall* constraint | **Paperwork.** LLC + Meta/TikTok/YouTube audits take months and are the real critical path. |
| Unit economics | ~$0.50–1.00/user/mo cost → 90%+ margin at $10–15/mo, if the free tier is capped. |
| Node version | **Node 24 LTS** (Vercel default; Node 20 disabled there Oct 1, 2026). |

## Repo layout

```
Winz/
├── README.md               ← you are here
├── ARCHITECTURE.md         ← technical system design
├── docs/
│   ├── STRATEGY.md         ← product strategy + build sequence
│   ├── BUSINESS-MODEL.md   ← the Adin/N3on reality check
│   ├── QUESTIONS-FOR-WINSLOW.md
│   └── research/           ← 29 research docs (3 sweeps) + index
├── .env.example            ← required env vars (secrets live in gitignored .env)
└── .gitignore
```
