# Questions for Winslow

Decision sheet sent to the streamer 2026-08-15. Answers gate Phase 0
(accounts + audits) in [ARCHITECTURE.md](../ARCHITECTURE.md).

## Picks

**1. Monthly budget**
- A) ~$45/mo launch (server $10 + third-party posting service $29 + AI ~$5) — public TikTok/YouTube posting from day 1 while our own API audits process
- B) ~$15–20/mo — no posting service; TikTok/YouTube wait on our own audits, Instagram live day 1
- Recommended: A, decays to B's cost once audits clear

**2. Account count** (every account gets DIFFERENT clips — duplicates across accounts get fingerprinted and suppressed)
- A) 2 per platform (6 total) — recommended start
- B) 4 per platform (12 total) — needs 12+ strong clips per stream day; scale-up target
- Hard rule either way: 1–2 YouTube channels max (Feb 2027: 10M engaged Shorts views/90 days per channel required for Shorts ad revenue)

**3. Posting mode at start**
- A) Human approve tap in dashboard before post (recommended month 1)
- B) Full auto day 1

## Questions

1. Exact Kick slug — confirm `winslowbankz`
2. Kick Partner or any signed Kick contract? (Partner terms = exclusive content license to Kick → affects off-platform reposting; standard ToS is non-exclusive, fine)
3. Channel verified on Kick? (VOD retention 7 vs 30 days)
4. Stream schedule: frequency + duration per week (drives clip supply)
5. Content type: gaming (which titles — licensed-music games like GTA/NBA 2K matter) or IRL/just-chatting? Music on stream? (music gate will skip/strip those moments — less music = more usable clips)
6. OBS? If yes → enable local recording as the capture source; else describe setup

## One-time actions (streamer-side)

1. Create clip accounts from phone on residential wifi, staggered over 1–2 weeks, unique email each — never from datacenter IPs
2. ~2 weeks manual native posting per new account (warm-up) before API posting ramps
3. 15-min session: register Kick developer app (2FA required) + OAuth each social account into the system
4. Written repost permission (one paragraph) if operators ≠ streamer

## Branding

- Watermark: confirm exact text "Kick.com/WinslowBankz" center-screen, or logo asset
- Account names/handles + bio links (e.g. "WinslowBankz Clips")
