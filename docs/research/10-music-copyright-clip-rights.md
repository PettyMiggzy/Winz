# Research: music-copyright-clip-rights

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

For a typical Kick gaming/IRL clip containing background music, detection on all three platforms is near-certain for commercially released tracks (fingerprinting runs at upload, API uploads are scanned identically to native ones), but the default consequence differs sharply: TikTok mutes, Instagram mutes/blocks with opaque account-level escalation, and YouTube issues Content ID claims that only become channel-killing strikes if the rights holder escalates to a manual takedown (3 strikes in 90 days = termination). The bigger structural risk is the rights chain: a third-party operator who is not the streamer needs a written license from the streamer to repost/monetize clips (fair use will not cover reformatting after Warhol v. Goldsmith), and even publisher-permissive games do not license their third-party music (GTA radio, NBA 2K soundtrack) for clips. Mitigation is tractable in an automated pipeline: a cheap music-vs-speech classifier (YAMNet/inaSpeechSegmenter) gates a fingerprint lookup (AudD ~$5/1k, ACRCloud), and flagged clips are either skipped (music-dominant) or music-stripped with Demucs/UVR (~3–8 s per 30 s clip on GPU) before the vertical render stage.

## Key facts

- YouTube: 3 copyright strikes in 90 days terminates the account and all associated channels; strikes expire 90 days after Copyright School. Content ID claims (the normal outcome for background music) do NOT create strikes — only manual takedown/removal requests do.
- YouTube Shorts: Shorts longer than 60s with any active Content ID claim are BLOCKED outright (policy effective with the Oct 15, 2024 1–3 min Shorts change); Shorts ≤60s with claimed music generally stay live but the music share is deducted from the Creator Pool before the 45% creator split.
- YouTube's 2019 manual-claim policy (still in force): rights holders cannot monetize manual claims on music clips under ~10s or unintentional background music — but they CAN still block the video; automated Content ID matches have no published minimum and reliably match 5–10s of a recognizable track.
- TikTok: most common outcome is audio muted (video stays live); repeat-infringer policy bans accounts with an undisclosed strike threshold; copyright strikes reportedly expire after 90 days; updated IP Policy effective April 26, 2025. July 2025 enforcement change: Business Accounts using general-library music face automatic muting even on organic posts.
- TikTok Content Posting API: unaudited clients are restricted to SELF_ONLY (private) posts and max 5 users/24h; the audit is mandatory for public direct-posting; API-posted video audio goes through the same copyright scanning as native uploads, and the API cannot attach licensed TikTok library sounds — audio must be baked into the file.
- Instagram/Meta: Rights Manager fingerprints every upload (API-published Reels included); rights holder chooses track/monetize/mute/block per match; Meta's Music Guidelines state content 'may be blocked, muted or removed' and that commercial/non-personal music use is prohibited without licenses; repeat violations escalate to account-level restrictions and disabling (no published numeric threshold). Instagram's native music library cannot be attached via the Graph API.
- There is no 'safe duration': all three platforms match pattern, not length — sub-10-second matches of a recognizable hook trigger action; Content ID held 100M+ active references and issued 2.2B claims in 2024 alone.
- Rights chain: a clip operator who is not the streamer needs the streamer's written permission — Kick's ToS grants KICK (not other users) a sublicensable license to streamer content; re-uploading someone else's stream for profit is infringement, and post-Warhol v. Goldsmith (2023) mere reformatting to vertical is not transformative fair use.
- Game publisher permissions never cover third-party licensed music: GTA V's 240+ licensed radio songs generated 1,100+ DMCA takedowns against creators (Kotaku 2021 investigation); NBA 2K/EA-style licensed soundtracks are equally uncovered — this is why games ship 'streamer mode'. Valve is permissive (monetize via platform partner programs, but no separate distribution of game music); Riot allows non-commercial use + passive ads and publishes Creator-Safe music guidelines; Nintendo requires creative input/commentary and restricts monetization to its approved platform partner programs.
- RIAA/NMPA's 2020–2021 Twitch DMCA waves specifically targeted CLIPS (Billboard: 'As Clips Come Down'); in 2025 Twitch moved to aggressive automated VOD music detection — on short-form platforms this enforcement is already fully automated at upload time, so per-clip detection probability is far higher than the Twitch-era notice model, though the per-hit consequence is usually softer (mute/claim vs strike).
- Mitigation costs: YAMNet (521-class AudioSet CNN) and inaSpeechSegmenter run faster than real time on CPU for music-presence gating; Demucs htdemucs processes a 30s clip in roughly 3–8s on a modern GPU (RTX 3090 processed a 4-min song in 24s) and ~30–60s+ on CPU (full 4-bag ensemble RTF ~0.26 on Apple M4 Pro); AudD music recognition is $5/1,000 requests (300 free) with an enterprise per-12s-chunk mode returning timestamps; AcoustID/Chromaprint is unsuitable for this job (full-track matching, fails on noisy/short background music).
- Separation gotcha: Demucs' 'vocals' stem keeps ALL vocals — a song's sung vocals bleed into the kept stem alongside streamer speech, so fingerprint-rescan the stripped output and skip clips where sung vocals dominate; YouTube's own AI 'Erase Song' tool (relaunched July 2024) exists as a post-claim remedy on YouTube only and admits imperfect removal.

## Gotchas

- No platform has a minimum 'safe seconds' — the 3/10/15-second myths are false; fingerprinting matches recognizable patterns in well under 10 s, and Instagram catches pitch-shifted, sped-up, and low-volume music.
- Ducking/lowering music volume does NOT defeat detection — fingerprinting is level- and speed-robust; only removal (mute/separation) or replacement works.
- Demucs/UVR 'vocals' stem retains the SONG's sung vocals, not just streamer speech — stripped clips must be re-scanned, and sung-foreground clips should be skipped, or the pipeline ships infringing a-cappella residue.
- Separation also discards game SFX (they sit in the 'other' stem with the music), so stripped gameplay clips can sound dead — consider mixing a royalty-free bed back in.
- AcoustID/Chromaprint cannot do this job (full-track, clean-audio matching only); budget for AudD/ACRCloud instead.
- YouTube Shorts between 61 s and 3 min with ANY active Content ID claim are blocked outright — keep everything ≤60 s.
- Disputing a YouTube Content ID claim can provoke the rights holder into a manual takedown, converting a harmless claim into a channel strike (3/90 d = termination).
- TikTok Business Accounts (and by extension commercial automation) are restricted to the Commercial Music Library; since July 2025 general-library music is auto-muted even on organic Business posts — and CML licenses are TikTok-only, not cross-platform.
- Both TikTok Content Posting API and YouTube Data API lock unaudited/unverified clients' uploads to PRIVATE — the pipeline needs TikTok's API audit and Google's API project audit before public posting is even possible.
- Neither the TikTok API nor the Instagram Graph API can attach the platform's licensed in-app music library — any audio must be baked into the file, where it is scanned with zero of the native-library licensing protection.
- Publisher clip permissions never cover third-party licensed music inside games — GTA radio (1,100+ DMCA takedowns per Kotaku), NBA 2K/EA soundtracks, Fortnite concerts; treat licensed-soundtrack games as music-positive by default.
- Reposting another streamer's clips without a written license is infringement regardless of platform culture — Kick's ToS licenses content to Kick, not to you; Warhol v. Goldsmith kills the 'vertical reformat is transformative' argument; the streamer's DMCA is what turns mutes into strikes.
- Kick's own lax music enforcement is irrelevant — risk materializes on the distribution platforms, and channels built on lax enforcement inherit the full risk when platforms sign label deals (as Twitch's 2025 VOD-detection tightening shows).
- Meta is the most opaque on account-level penalties: no published strike count, and repeated Rights Manager hits can demote reach or disable the account with limited appeal via an API-only workflow.
- TikTok strike counts reportedly expire after ~90 days but the ban threshold is deliberately undisclosed and TikTok reserves the right to instantly ban for 'severe' violations.
- IRL clips are not exempt: venue/store/car radio music is treated the same as added music; 'unintentional' only limits manual monetization claims on YouTube, not mutes/blocks anywhere.

## Full details

## 1. Platform detection & enforcement (2025–2026)

### YouTube (Shorts)
- **Scanning**: Content ID scans every upload regardless of ingestion path — `videos.insert` via the Data API is scanned identically to Studio uploads. As of 2025 Content ID holds **100M+ active reference files**, processes 500+ hours of video/minute, and issued **2.2B claims in 2024**. Separate API gotcha: videos uploaded by **unaudited/unverified API projects (created after July 28, 2020) are locked to private** until the project passes YouTube's API audit — so an audited project is a prerequisite for public Shorts posting anyway.
- **Match duration**: no published minimum; in practice 5–10 s of a recognizable hook matches. The 2019 policy (still in force per YouTube's manual-claiming rules) only limits *manual* claims: rights holders **cannot monetize** manual claims on very short (<~10 s) or unintentional music, but **can still block**. Automated matches are unrestricted.
- **Consequences ladder**:
  1. **Content ID claim** (default for background music): video stays up; on long-form revenue is redirected. On Shorts ≤60 s the video generally stays live; music partners are paid out of the Creator Pool *before* the 45 % creator split, so claims dilute rather than zero revenue.
  2. **Shorts 61–180 s**: any active Content ID claim, regardless of the owner's policy, **blocks the Short entirely** (policy tied to the Oct 15 2024 expansion of Shorts to 3 min). Keep clips ≤60 s.
  3. **Copyright strike**: only from a manual takedown (DMCA removal request). **3 strikes in 90 days = channel + all associated channels terminated**, and no new channels allowed. Strikes expire 90 days after completing Copyright School. Disputing a Content ID claim can provoke the owner into a takedown → strike.
- **Remedies**: Studio "Erase Song" (AI-based, relaunched July 2024) removes only the claimed song while keeping voice/SFX; "Mute all sound" fallback; trim claimed segment. Works post-claim, YouTube-only, imperfect on dense mixes.

### TikTok
- **Scanning**: automated fingerprint scan at upload (seconds), backed by TikTok's label licensing deals; pre-publish "Video sound copyright check" toggle exists in Creator Tools. Updated **IP Policy effective April 26, 2025**.
- **Consequences ladder**: (a) **audio muted** — most common; video stays live with a "Change sound" prompt (TikTok can sometimes remove just the matched track and keep voice/SFX); (b) **video removed** for clear/repeated infringement; (c) **repeat-infringer ban** — threshold undisclosed ("we... ban the account of a user who repeatedly commits copyright infringement" and "may... immediately ban any account in cases of severe copyright violations"); strikes reportedly age out after ~90 days. Appeals go through the in-app flow and may be forwarded to the claimant.
- **Business/API context**: Business Accounts are legally limited to the **Commercial Music Library (~1M pre-cleared tracks, TikTok-only license)**; since **July 2025**, Business Accounts using general-library music get **automatically muted even on organic posts**. Content Posting API: unaudited clients post **SELF_ONLY** with a 5-user/24 h cap; the audit is mandatory for public `video.publish` (Direct Post). API uploads carry no library-sound attachment mechanism — whatever audio is in the file is what gets scanned, same pipeline as native uploads. An automation pipeline is commercial-flavored use; assume CML-grade scrutiny.

### Instagram Reels (Meta Rights Manager)
- **Scanning**: Rights Manager fingerprints audio of **every** upload on FB+IG, including Reels published through the Graph API Content Publishing flow (`/{ig-user-id}/media` → poll container `status_code` → `media_publish`); creators report API-published Reels muted seconds after publish. Detection survives pitch/tempo shifts and low music volume; matches on short segments.
- **Consequences**: per Meta's official Music Guidelines — "your video may be **blocked, muted or removed**"; possible geo-blocking; live/recorded both covered; explicit rule that **"use of music for commercial or non-personal purposes... is prohibited unless you have obtained appropriate licenses."** Guidelines recommend "shorter clips of music" and a dominant visual component, but give **no safe duration**. Rights holder per-match options: track / monetize / mute / block.
- **Account-level**: repeat violations accumulate in Account Status; escalation includes reach demotion, feature loss (music, monetization), and account disabling. No published numeric strike threshold — Meta is the most opaque of the three. Graph API cannot attach IG's licensed music library; business/creator accounts have narrower music rights (Meta Sound Collection is the only fully safe bed).

### Cross-platform constants
- **No duration safe harbor** anywhere: detection is pattern-based, not timer-based; 10–30 s clips are squarely within matchable range if the track is commercially released.
- **API parity**: all three scan API uploads with the same fingerprinting as native uploads. The API differences are procedural (TikTok audit/private-lock, YouTube API-project audit/private-lock, IG container publishing), not copyright-related.
- **IRL clips**: venue/car/store music is treated identically to deliberately added music (Twitch-era precedent: streamers DMCA'd for store background music). "Unintentional" only softens *manual monetization* claims on YouTube; it does not prevent mutes/blocks.

## 2. Rights chain

### Streamer permission
- If the operator **is** the streamer: they own their commentary/webcam/stream arrangement, subject to game-publisher and music licenses. Kick's ToS grants **Kick** a perpetual, irrevocable, sublicensable, royalty-free license to user content — this licenses *Kick*, not third parties, and does not stop the streamer from clipping their own content.
- If the operator is **not** the streamer: reposting/monetizing someone else's stream without permission is infringement of the streamer's copyright; the streamer can DMCA every distribution account (and a DMCA takedown is exactly the event that converts platform outcomes from "mute/claim" into strikes/removals). Fair use will rarely help: **Warhol v. Goldsmith (2023)** makes clear that reformatting (horizontal→vertical, adding captions) is not transformative for a commercial repost. 2025–2026 "clipping economy" practice: get a **written license** from the streamer (grant of rights to edit, distribute, and monetize clips on named platforms, plus their name/likeness), or operate the accounts as the streamer's official clips channels. FTC disclosure applies to paid clipping arrangements.

### Game publishers (as of 2026)
- **Valve** (Video Policy): explicitly fine with monetized gameplay videos via platform partner programs; prohibits distributing extracted assets (including game **music**) separately.
- **Riot**: "Legal Jibber Jabber" — personal non-commercial use plus **passive ads allowed** (pre-roll, ad breaks, sponsor overlays); publishes **Riot Music Creator-Safe Guidelines** because *not all* Riot-adjacent music is safe (collab tracks with outside artists carry third-party rights).
- **Nintendo** (Game Content Guidelines, most recently revised 2024): monetization only through the **approved partner programs of the platforms Nintendo lists**; content must include "creative input and commentary" — raw cut clips "that are mere copies" are outside the permission; selling extracted video/music/images prohibited. Check the current approved-platform list before auto-posting Nintendo content.
- **The universal music carve-out**: publisher permission covers *the publisher's own* assets, never third-party licensed sync tracks. **GTA V's 240+ licensed radio songs → 1,100+ DMCA takedowns against creators (Kotaku 2021)**; NBA 2K/EA sports soundtracks, Fortnite concerts/emote tracks are equivalent traps. Games ship "streamer mode" for a reason; a Kick VOD won't have it enabled retroactively — treat licensed-soundtrack games as music-positive by default in the pipeline.

### Twitch-era DMCA → short-form today
- The **RIAA/NMPA 2020–2021 waves targeted clips specifically** (thousands of takedowns, threatened permabans; Twitch responded with mass clip deletion and Soundtrack by Twitch). In 2025 Twitch runs aggressive automated VOD music muting and warned DJ streams of "enforcement," while negotiating label deals. Translation: on TikTok/YouTube/IG the labels don't need DMCA waves — **enforcement is pre-baked into upload-time fingerprinting** (Content ID / Rights Manager / TikTok's licensing filters). Probability of detection per clip is far higher than Twitch-era; severity per hit is lower (mute/claim) *until* a label escalates to takedowns, at which point strike math (YouTube 3/90d, TikTok/IG repeat-infringer) threatens the accounts. UMG has historically been the most takedown-aggressive on stream-clip music.

## 3. Mitigation engineering

### Stage A — music-presence detection (every clip candidate, cheap)
- **Classifier first**: YAMNet (TF-Hub, 521 AudioSet classes, MobileNet-scale, faster than real time on CPU; compare Speech vs Music scores per ~1 s frame, smooth + threshold) or **inaSpeechSegmenter** (CNN speech/music/noise segmenter, CPU-friendly) → outputs per-segment music probability and timestamps. PANNs/CLAP for higher accuracy at more compute. Cost: effectively free per 30 s clip.
- **Fingerprint only flagged clips**: **AcoustID/Chromaprint is the wrong tool** — by its own docs it identifies full clean recordings, "trades precision and robustness for search performance," and fails on short, noisy, speech-overlaid snippets. Use a Shazam-style landmark service: **AudD** ($5/1,000 requests, 300 free; enterprise mode bills per 12 s chunk and returns per-match timestamps — ideal for scanning a 30 s clip) or **ACRCloud** (tiered/custom pricing, custom fingerprint DBs, offline file-scanning products). The fingerprint answer ("known commercial track X at t=4–19 s") is your decision input and audit log.
- **Metadata prior**: game title from the Kick VOD/category → static allow/deny list (GTA, NBA 2K, Fortnite = music-risk-high; competitive FPS/MOBA = low).

### Stage B — strip or skip (flagged clips only)
- **Source separation**: Demucs `htdemucs`/`htdemucs_ft` (or UVR with MDX-Net / BS-RoFormer models — 2026 benchmarks put BS-RoFormer ahead on separation quality). Keep the **vocals** stem (streamer speech), drop drums/bass/other (the music bed). Throughput: **~3–8 s per 30 s clip on a modern GPU** (RTX 3090 does a 4-min track in ~24 s; single-stem ONNX variants faster); **CPU ~1–2× real time or worse** for the full 4-bag ensemble (RTF ~0.26 even on Apple M4 Pro with MPS; a plain server CPU is slower) — GPU strongly recommended for a pipeline.
- **Known failure modes**: (1) **sung-vocal bleed** — the vocals stem keeps the *song's* singer too, so stripping a clip where the track's vocals are prominent leaves infringing residue; (2) **game SFX loss** — SFX land mostly in "other" and get discarded with the music, flattening gameplay clips; (3) artifacts on dense/reverby mixes. Countermeasures: re-run Stage A classifier + fingerprint on the *stripped* output as a QA gate; use karaoke/lead-vocal-vs-backing models for sung content; if QA still matches → **skip the clip**.
- **ffmpeg fallbacks** (no ML): hard-mute flagged windows — `ffmpeg -i in.mp4 -af "volume=enable='between(t,4.0,19.0)':volume=0" ...`; duck instead of mute with `sidechaincompress` keyed on the speech stem; or replace the bed entirely with a pre-cleared library track mixed under the kept speech stem (`amix` + `loudnorm`). Muting is detection-proof but kills IRL-clip ambience; ducking alone is NOT safe — fingerprinting survives level reduction.
- **What commercial tools do** (they don't solve it): **Eklipse** avoids the problem — royalty-free music/SFX library only, positions itself as "DMCA-safe" by never adding copyrighted tracks (no removal feature); **StreamLadder** ships a pre-cleared royalty-free music library "cleared for TikTok/YouTube/Instagram"; **OpusClip** offers only mute/remove-audio editing. Dedicated music-removal is a separate product class (**AudioShake** music removal, **LALAL.AI** dialogue extractor, YouTube's own Erase Song). A Demucs stage therefore exceeds what the commercial clip tools offer.

### Pipeline placement
`VOD download → highlight detection → clip candidate (10–30 s) → [MUSIC GATE: classifier → fingerprint → decide skip / strip / pass] → (optional Demucs strip + QA re-scan) → vertical crop/captions/render → loudnorm → per-platform encode → API publish → post-publish verification`.
The gate must run **before** the render (so stripped audio feeds captioning/waveform styling and you never burn render time on a doomed clip) and the QA re-scan **after** stripping. Post-publish: poll TikTok Direct Post status + moderation outcome, YouTube `videos.list` upload status and Studio claims, IG container `status_code`; treat any mute/claim event as a signal to tighten the gate threshold and to count toward a self-imposed strike budget per account.

## Per-platform risk matrix (typical Kick gaming/IRL clip, commercial track audible)

| Platform | P(detection) for released track | Default consequence | Escalation path | Account-kill risk |
|---|---|---|---|---|
| TikTok | Very high (upload-time scan, label deals) | Audio muted, video live ("Change sound") | Removal for repeat/severe; strikes expire ~90 d; undisclosed ban threshold; Business/CML rules mute even organic posts (Jul 2025) | Medium — opaque repeat-infringer bans; mutes zero out clip value long before ban |
| YouTube Shorts (≤60 s) | Very high (Content ID) | Claim: video live, Creator-Pool music deduction; claims ≠ strikes | Manual takedown → strike; 3 strikes/90 d = termination of channel + associated channels; >60 s Shorts with claim = blocked | Low-medium if claims are left undisputed; high if a label (esp. UMG) starts takedowns |
| Instagram Reels | Very high (Rights Manager, catches low-volume/pitch-shifted) | Mute or block (rights-holder's choice), geo-blocks | Account Status violations → reach demotion, feature loss, account disable; no published threshold | Medium-high — most opaque escalation, least recourse via API-only workflow |

**Decision rule**: (1) No music detected → publish. (2) Music detected but fingerprint finds no commercial match (e.g., original game score of a permissive publisher, no third-party sync) → publish, log. (3) Commercial match, music **background** under dominant speech → Demucs strip → QA re-scan clean → publish; QA dirty → skip. (4) Commercial match, music **foreground/dominant** (IRL club/DJ/singing along, GTA radio bangers, music-reaction moments) → **skip** — stripping destroys the clip's value and residue risk is highest. (5) Any clip whose *content* is the music (reaction to a song, karaoke) → skip categorically; that's also the exact category RIAA-style enforcement targets. Keep all Shorts ≤60 s. Never repost non-consenting streamers; hold a written clip license.

## Sources

- [TikTok Intellectual Property Policy (effective April 26, 2025)](https://www.tiktok.com/legal/page/global/copyright-policy/en)
- [TikTok Content Posting API — Direct Post reference (unaudited client restrictions)](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Content Sharing Guidelines (API audit requirements)](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [YouTube Help — Copyright strike basics (3 strikes / 90 days)](https://support.google.com/youtube/answer/2814000?hl=en)
- [YouTube Help — Manage Shorts as a rights holder (claims on Shorts; >60s block)](https://support.google.com/youtube/answer/13053317?hl=en)
- [YouTube Help — Music eligibility for YouTube Shorts](https://support.google.com/youtube/answer/13486873?hl=en)
- [YouTube Help — Shorts monetization policies (Creator Pool music split)](https://support.google.com/youtube/answer/12504220?hl=en)
- [YouTube Data API — videos.insert (unverified API project private-lock)](https://developers.google.com/youtube/v3/docs/videos/insert)
- [Variety — YouTube stops manual-claim monetization of very short music clips (2019 policy)](https://variety.com/2019/digital/news/youtube-music-copyright-claims-monetizing-short-clips-1203304462/)
- [TechCrunch — YouTube's updated Erase Song tool (July 2024)](https://techcrunch.com/2024/07/05/youtubes-updated-eraser-tool-removes-copyrighted-music-without-impacting-other-audio)
- [Meta — Music Guidelines (official)](https://www.facebook.com/legal/music_guidelines)
- [Too Lost — Meta Rights Manager Explained](https://help.toolost.com/hc/en-us/articles/4412265577108-Meta-Rights-Manager-Explained)
- [Kick — Terms of Service](https://kick.com/terms-of-service)
- [Kick — DMCA Policy](https://kick.com/dmca-policy)
- [StreamHush — Kick copyright rules and music (2026)](https://www.streamhush.com/blog/kick-copyright-rules-music)
- [Nintendo Game Content Guidelines for Online Video & Image Sharing Platforms](https://www.nintendo.co.jp/networkservice_guideline/en/)
- [Valve Video Policy](https://store.steampowered.com/video_policy)
- [Riot Games — Legal Jibber Jabber](https://www.riotgames.com/en/legal)
- [Riot Music — Creator Safe Guidelines](https://www.riotgames.com/en/riot-music-creator-safe-guidelines)
- [Billboard — Music Industry vs. Twitch: licensing tensions as clips come down (RIAA/NMPA DMCA waves)](https://www.billboard.com/articles/business/9480719/music-industry-twitch-licensing-dmca-takedowns-riaa-nmpa/)
- [ExpertBeacon — Is the music in GTA V copyrighted? (Kotaku 1,100+ DMCA takedowns)](https://expertbeacon.com/is-the-music-in-gta-v-copyright/)
- [Luminaclippers — Is Clipping Legal? (2026 guide, streamer permission, Warhol)](https://luminaclippers.com/blog/is-clipping-legal)
- [ClipAffiliates — Is Clipping Legal? Copyright, Fair Use & How to Clip Safely (2026)](https://www.clipaffiliates.com/blog/is-clipping-legal)
- [SRIPLAW — TikTok's 2025 Commercial Music Library: What Brands Still Get Wrong](https://sriplaw.com/blog/tiktoks-2025-commercial-music-library-what-brands-still-get-wrong/)
- [AcoustID / Chromaprint (limitations for short noisy clips)](https://acoustid.org/chromaprint)
- [ACRCloud — Choosing an audio fingerprinting service](https://www.acrcloud.com/blog/choosing-audio-fingerprinting-service/)
- [AudD Music Recognition API (pricing, enterprise per-12s mode)](https://audd.io/)
- [StemSplit.io — htdemucs ONNX benchmarks (real-time factors)](https://huggingface.co/StemSplitio/htdemucs-ft-onnx)
- [aistemsplitter.org — htdemucs vs BS-RoFormer vs Spleeter 2026 benchmark](https://aistemsplitter.org/blog/htdemucs-vs-bs-roformer-vs-spleeter-2026-benchmark)
- [DEV Community — Audio segmentation with YAMNet (speech/music/silence)](https://dev.to/vast-cow/audio-segmentation-with-yamnet-detecting-speech-music-and-silence-312h)
- [MathWorks — Detect Music Using YAMNet](https://www.mathworks.com/help/audio/ug/detect-music-in-simulink-using-yamnet.html)
- [Eklipse Help — Limitations on content / copyrighted material](https://eklipse.gg/help/are-there-limitations-on-content-type-or-copyrighted-material/)
- [StreamLadder — Royalty-free music & sound effects for clips](https://www.streamladder.com/clip-editor/music-sound-effects)
- [OpusClip — Remove audio from video tool](https://www.opus.pro/tools/remove-audio-from-video)
- [AudioShake — Music removal product](https://www.audioshake.ai/products/music-removal)
- [TikTok Creator Academy — Appeal muted video](https://www.tiktok.com/creator-academy/article/appeal-muted-video)
- [Postproxy — Instagram Reels API publishing guide (2026, API mute behavior)](https://postproxy.dev/blog/instagram-reels-api-publishing-guide/)
- [Foxi — Instagram Reels music copyright legal guide (2026)](https://www.foximusic.com/blog/instagram-reels-music-copyright-legal-guide/)
- [Soundstripe — TikTok copyright rules for creators (2026)](https://www.soundstripe.com/blogs/tiktok-copyright)
