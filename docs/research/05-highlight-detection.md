# Research: highlight-detection

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

In 2026, practical VOD highlight detection is a fusion problem: cheap per-signal detectors (audio RMS/loudness spikes via librosa or ffmpeg astats/ebur128, chat messages-per-second z-scores, and Whisper transcripts scored by an LLM for clip-worthiness) are normalized per-stream and combined, with scene detection used only for boundary snapping — this is essentially what commercial tools (OpusClip ClipAnything, Eklipse, Powder, Vizard Spark) describe doing with added game-specific vision models. Open-source end-to-end projects exist (AI-Youtube-Shorts-Generator ~4.6k stars MIT, Clipception, VodAutoClipper) but the strongest ones are transcript+LLM-centric; chat-velocity has deep prior art on Twitch and is portable to Kick via the unofficial Pusher websocket (real-time) since Kick has no official past-chat API. A v1 pipeline (faster-whisper large-v3-turbo + librosa RMS + chat z-score + Claude Haiku/Sonnet rerank) processes a 30-min VOD in ~3–5 min on a consumer GPU for roughly $0.02–0.09 of LLM spend.

## Key facts

- faster-whisper is at v1.2.1 (Oct 2025; v1.2.0 Aug 2025): batched inference ~4x faster, Silero-VAD v6, distil-large-v3.5 support; ~4x faster than openai/whisper on GPU, 13-min audio in ~59s (large-v3 INT8, ~2.9GB VRAM); ~35x realtime on an L40S ($0.75/hr cloud)
- No new base Whisper weights since large-v3/large-v3-turbo (turbo: 4 decoder layers vs 32, ~6-8x faster, minimal accuracy loss); 2025-26 gains are all runtime/tooling (batching, VAD, quantization)
- faster-whisper word_timestamps=True gives ±100-500ms accuracy; WhisperX (faster-whisper + wav2vec2 forced alignment) tightens to ~±30ms and runs 60-70x realtime batched — good enough to cut clips on word boundaries
- Current Claude pricing (claude-api skill, cached 2026-06-24): Haiku 4.5 $1/$5 per MTok, Sonnet 4.6 $3/$15, Sonnet 5 $3/$15 (intro $2/$10 through 2026-08-31), Opus 5 $5/$25; Batch API is 50% off — LLM transcript scoring costs ~$0.03/VOD-hour (Haiku), ~$0.10/VOD-hour (Sonnet), ~$0.18/VOD-hour (Opus 5) at ~25k input tokens/hour of speech
- Chat-velocity highlight detection has rich Twitch prior art (chatplot, twitch-chat-highlights, twitch-highlight-finder, Twitch-Autoclip SVM, LIGHTOR paper, e-sports video-audio-chat fusion papers, ~0.83 accuracy classifying popular moments from emote embeddings)
- Kick: official API is webhook-based (chat.message.sent, requires app + streamer OAuth + public webhook URL); the unofficial Pusher websocket (same one kick.com uses) is readable without auth via libraries like @retconned/kick-js, KickLib (C#), kick-api (Rust); no official past-chat/VOD-chat API — capture live or use unofficial replay tools (Kicklet, Streams Charts)
- Largest open-source end-to-end repo: Anil-matcha/AI-Youtube-Shorts-Generator (~4.6k stars, MIT, Python) — faster-whisper/Whisper -> LLM virality rubric scoring (hooks, emotional peaks, conflict, quotables) with 20-min overlapping chunks -> dedup -> ffmpeg/OpenCV vertical crop
- Clipception (MIT, Python): audio excitement/laughter features + Fast Whisper + DeepSeek-V3 via OpenRouter ranking; ~30 min to process a 4+ hour 1080p VOD on CUDA GPU
- Commercial signal stacks: OpusClip ClipAnything = visual cues + audio sentiment + facial expressions + narrative structure (prompt-driven, virality score, 8-15 clips/video); Eklipse = game-event reading from frame graphics/kill-feed + voice pitch spikes + chat velocity + per-game tuning (supports Kick); Powder = 40+ per-game vision models + laughter/emotion detection + chat engagement; Vizard Spark 1.0 = 'video understanding LLM' over visuals+audio+story with keyword prompts
- PySceneDetect (ContentDetector/AdaptiveDetector) is noise-prone as an excitement signal on gaming/IRL footage (constant in-game camera motion = false cuts); its practical role is clip-boundary refinement and splitting edited/scene-changing content, which matches how commercial tools use scene detection (natural breakpoints, not hype detection)
- Audio signal implementation: librosa.feature.rms on ~0.5-1s windows -> per-stream z-score -> rolling-percentile peaks; or ffmpeg astats (RMS_level per frame), ebur128 (momentary LUFS), silencedetect (inverse signal); existing tool auto-highlighter-py uses a flat dB threshold (default 85dB) — relative baselines beat absolute thresholds
- Rough v1 cost per 30-min VOD: consumer GPU (RTX 3060+) total ~3-5 min wall clock (ASR ~1-2 min with turbo+batching, audio features seconds, chat trivial, LLM ~30s, ffmpeg -c copy cuts seconds) + $0.02-0.09 API spend; CPU-only ~15-35 min using distil/turbo models

## Gotchas

- Chat lags the moment it reacts to by ~5-20s (LIGHTOR paper finding) — always shift chat-spike windows backward before cutting, and add broadcast-delay offset when aligning live-captured chat to VOD time
- Kick's Pusher websocket and VOD-chat-replay endpoints are unofficial/undocumented — they can break on Pusher key rotation or Cloudflare changes; the official API only delivers chat via webhooks after per-streamer OAuth, and Kick auto-unsubscribes your webhook after 3 failed deliveries; there is NO official past-chat API
- Absolute loudness thresholds (e.g., auto-highlighter's 85dB default) false-positive on game music/soundboards — use per-stream z-scores/rolling percentiles, and remember RMS averages energy (misses short screams) while LUFS/ebur128 is closer to perceived loudness
- faster-whisper's native word_timestamps are only ±100-500ms accurate — fine for finding moments, too sloppy for cutting on word boundaries; use WhisperX forced alignment (~±30ms). Whisper also hallucinates on music/long silence — keep the VAD filter on (Silero v6 in v1.2.1)
- Transcript-only LLM scoring is blind to silent visual moments (clutch plays with no commentary) — the exact gap OpusClip/Eklipse/Powder attack with per-game vision models; without those, expect to miss purely visual highlights
- PySceneDetect on gaming/IRL footage produces constant false cuts from in-game camera motion; raising the threshold misses real cuts — use it for boundary snapping only, not as an excitement signal
- Claude Sonnet 5 intro pricing ($2/$10 per MTok) expires 2026-08-31 — cost estimates using it go stale in two weeks; standard is $3/$15. Batch API (50% off) is the right lane for backlog VOD processing
- Star counts and activity for the small GitHub repos (Clipception, VodAutoClipper, etc.) were spot-checked via page fetches and may drift; only AI-Youtube-Shorts-Generator (~4.6k) is a materially adopted codebase — most 'end-to-end' repos are thin demos you'd rewrite
- Scraping Twitch/Kick chat and re-uploading VOD content sits in ToS gray zones (Kick scraper actors are already being deprecated on Apify); per-streamer OAuth flows are the durable path for a product
- Speaker attribution matters for multi-person streams: VodAutoClipper resorts to manual pitch thresholds; proper diarization (WhisperX + pyannote) needs a HF token and adds runtime
- LLM chunking needs overlap (AI-Youtube-Shorts-Generator uses 20-min chunks with overlap) or you lose highlights straddling chunk boundaries; dedup overlapping candidates by score afterward

## Full details

## 1. Signal-based (audio loudness/energy)

**How it works in practice.** Extract audio (`ffmpeg -i vod.mp4 -vn -ac 1 -ar 16000 audio.wav`), compute short-window energy, normalize against the *stream's own baseline*, and pick peaks:

- **librosa**: `librosa.feature.rms(y=y, frame_length=2048, hop_length=512)` → aggregate to 0.5–1s windows → z-score per stream → mark windows above ~95th rolling percentile, merge adjacent windows into candidate spans. RMS tracks sustained level, not momentary spikes, so pair it with a shorter peak measure (max amplitude or spectral flux) for scream/hype detection. Also useful: `librosa.piptrack`/`pyin` pitch — voice pitch jumps correlate with excitement (Eklipse explicitly uses "voice pitch spikes, sudden shouting").
- **ffmpeg-native** (no Python deps):
  - `ffmpeg -i a.wav -af astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -` → per-frame RMS dB you can parse.
  - `ebur128` filter → momentary/short-term LUFS (perceptually better than RMS).
  - `silencedetect=n=-30dB:d=0.5` → inverse signal; long silences also make good clip cut points. (`loudnorm` with `print_format=json` is for *normalization measurement* — EBU R128 integrated loudness — not really for spike detection; use `astats`/`ebur128` for that.)
- **Existing tool**: `auto-highlighter-py` (PyPI) clips a VOD wherever loudness exceeds a flat threshold (default 85 dB) — illustrative of the naive approach and its weakness: game music/soundboards blow through absolute thresholds. Best practice is per-stream z-scores and, if possible, running loudness on a *speech-emphasized* band or the mic track when available.
- **Audio-event classifiers**: Clipception and Powder both advertise laughter/excitement detection; open-source equivalents are AudioSet-style classifiers (e.g., YAMNet-class models detecting laughter/cheering/shouting) layered on top of raw energy (note: this specific pairing is my synthesis; the tools don't document their exact models).
- Academic support: 2026 SciTePress paper on multi-modal broadcast-audio highlight detection uses librosa features + threshold-based peak detection over model probabilities.

**Verdict:** cheapest signal per compute-dollar; high recall for hype/rage/laughter moments, poor precision alone (loud ≠ interesting). Runs in seconds per VOD-hour.

## 2. Transcript-based (ASR + LLM scoring)

**ASR state of the art (2026):**
- **faster-whisper v1.2.1** (SYSTRAN, Oct 2025; v1.2.0 Aug 2025): CTranslate2 backend, `BatchedInferencePipeline` (~4x speedup over sequential), Silero-VAD v6 filter, distil-large-v3.5 support. Benchmarks: large-v3 INT8 on GPU ≈ 13-min audio in **~59 s** (~2.9 GB VRAM) vs 2m23s for reference Whisper; **~35x realtime on an L40S** ($0.75/hr cloud → ASR cost ≈ $0.01–0.02 per VOD-hour). CPU is workable with small/distil/turbo models (roughly 2–5x realtime on a modern desktop; large-v3 full precision on CPU can be slower than realtime — pick turbo/distil for CPU).
- **whisper.cpp**: still the choice for zero-dependency/edge/CPU (quantized GGML/GGUF kernels, Metal/CUDA backends); ~8x realtime with large-v3 on an RTX 4070, much faster with **large-v3-turbo** (4 decoder layers vs 32; ~6–8x faster than large-v3, near-equal accuracy). **No new base Whisper weights in 2025–26** — large-v3 / turbo / distil variants remain the frontier; all recent wins are runtime-level.
- **Word-level timestamps**: `word_timestamps=True` in faster-whisper = ±100–500 ms (attention-derived). **WhisperX** (faster-whisper + wav2vec2 forced alignment + optional pyannote diarization) = ~±30 ms at 60–70x realtime batched. For cutting clips on word/sentence boundaries WhisperX is the practical default; MFA is more accurate still but heavyweight.

**LLM scoring of transcript windows.** The dominant open-source pattern (AI-Youtube-Shorts-Generator, Clipception, VodAutoClipper, OpenClip):
1. Chunk transcript into windows (AI-Youtube-Shorts-Generator: 20-min segments with overlap for >30-min videos), each line timestamped.
2. Prompt the LLM with a **virality rubric**: hook strength, emotional peaks, opinion bombs/controversy, revelations, conflict, quotability, story completeness, practical value — return JSON: `{start, end, score (0-100), category (funny|hype|controversial|wholesome), title, reason}`.
3. Enforce constraints in the prompt: clips must stand alone without prior context, 15–90 s, must start on a sentence boundary, prefer segments that open with a strong hook.
4. Dedup overlapping candidates by score; optionally a **second rerank pass** on the top-N with wider context (±30–60 s).

Structured outputs (`output_config.format` json_schema on the Claude API, or `client.messages.parse()` with Pydantic) remove JSON-parsing failures.

**Cost per hour of VOD with current Claude pricing** (Haiku 4.5 $1/$5; Sonnet 4.6 $3/$15; Sonnet 5 $3/$15 with $2/$10 intro through 2026-08-31; Opus 5 $5/$25 per MTok; Batch API −50%). One hour of speech ≈ 8–10k words ≈ 12–14k tokens; with timestamps, overlap, and system prompt budget ~25k input + ~2k output per VOD-hour:

| Model | Per VOD-hour (sync) | Per VOD-hour (batch) |
|---|---|---|
| Haiku 4.5 | ~$0.035 | ~$0.018 |
| Sonnet 5 / 4.6 | ~$0.11 (intro Sonnet 5 ~$0.07) | ~$0.05 |
| Opus 5 | ~$0.18 | ~$0.09 |

A two-stage pattern (Haiku screens everything → Sonnet/Opus reranks top ~10 % of windows) lands around **$0.05–0.10 per VOD-hour** with near-Opus final quality. Known limitation of the whole approach: the LLM reads text only — silent visual plays score zero (this is exactly the gap OpusClip markets ClipAnything against).

## 3. Chat velocity

**Prior art (Twitch, extensive):**
- `packsun/chatplot` — messages-per-minute histogram via IRC bot.
- `dsteffan/twitch_chat_analysis` — messages/sec time series; spikes = highlights.
- `joaohenggeler/twitch-chat-highlights` — counts of specific words/emotes (KEKW, LUL, OMEGALUL, "CLIP IT") per time window.
- `hougesen/twitch-highlight-finder` — microservice pipeline: WS chat collector → analysis → highlight ID → video cutter.
- `xurei/twitch-highlights-logger` — threshold on filtered message counts per window.
- `DennisPing/Twitch-Autoclip` — SVM text classifier on chat to find highlights without watching.
- Research: LIGHTOR ("Implicit Crowdsourcing", arXiv 1910.12201) — key finding: chat spikes *lag* the actual moment, so you must learn/apply a backward offset; "Live Stream Highlight Detection Using Chat Messages" (2020); Autohighlight (LoL esports, 2022); video–audio–chat CNN fusion (2022); emote-embedding sentiment model classifying popular vs ordinary moments at ~0.826 accuracy.

**Implementation**: bucket messages into 5–10 s bins; compute z-score vs a rolling 5–10-min baseline (streams have wildly different baseline chat rates); weight by unique-chatters spike and emote/keyword density; shift detected spikes **back 5–20 s** to compensate for reaction + broadcast delay. For VODs, get chat offline: **TwitchDownloader** (`lay295/TwitchDownloader`) dumps full VOD chat replay to JSON.

**Kick applicability:**
- Official Kick Dev API is **webhook event subscriptions** (`chat.message.sent`): requires an app, streamer OAuth grant with events-subscribe scope, and a public webhook URL; Kick retries 3x then auto-unsubscribes on failure. Fine for a consenting-streamer product, useless for arbitrary channels.
- **Unofficial Pusher websocket** — the same feed kick.com's own chat UI uses — is readable without auth; wrapped by `@retconned/kick-js` (TS), `Bukk94/KickLib` (C#), `kick-api` (Rust crate). This is the practical real-time capture path but it's undocumented and can break (Pusher key rotation, Cloudflare).
- **No official past-chat API**: for VODs either record chat live yourself, or use unofficial replay extractors (Kicklet chat downloader — JSON/text export; Streams Charts chat-logs-downloader — CSV for Twitch/Kick/YouTube; `dknos/kick-save` captures chat + VODs). Treat replay endpoints as fragile.

## 4. Scene/visual (PySceneDetect etc.)

PySceneDetect (`Breakthrough/PySceneDetect`, actively maintained, `detect-content` / `detect-adaptive` / `detect-threshold`) is a *shot-change* detector, not an excitement detector. For gaming/IRL streams the honest assessment: **mostly noise as a highlight signal** — continuous first-person camera motion, kill-cam cuts, and handheld IRL footage trigger constant false cuts; raising thresholds then misses real transitions (a documented tradeoff). Where it earns its place:
- **Boundary snapping**: once fusion picks a highlight window, snap clip start/end to the nearest scene cut or silence for clean edits (AdaptiveDetector's rolling-average threshold works best here).
- **Segmenting edited/loading-screen content** (menu→game transitions, IRL location changes) for coarse chaptering.
- Commercial tools use visual analysis differently: OpusClip uses scene detection for "natural breakpoints", and Eklipse/Powder use *game-specific* frame-graphics readers (kill feed, round results, on-screen markers) — that's supervised per-game vision, not generic scene detection. A v1 without per-game models should skip visual excitement scoring entirely and use PySceneDetect only for boundary refinement (run on 480p downscale to keep it ~2–4x realtime CPU).
- Object-detection alternative: `bendawg2010/Auto-clipper` runs YOLO + pixel analysis on kill-feed regions — the open-source approximation of Eklipse's approach, but per-game templates are a maintenance treadmill.

## 5. Open-source VOD→clips projects (2024–2026)

| Repo | Stars | License | Approach |
|---|---|---|---|
| `Anil-matcha/AI-Youtube-Shorts-Generator` | ~4,600 | MIT | Whisper/faster-whisper → LLM content-type classification → 20-min overlapping chunks → virality-rubric LLM ranking (OpenAI/Gemini or MuAPI) → dedup → ffmpeg+OpenCV vertical crop. Closest thing to an open OpusClip. |
| `msylvester/Clipception` | ~14 (per repo page; promoted via clipception.xyz) | MIT | Audio excitement/laughter features + Fast Whisper + **DeepSeek-V3 via OpenRouter** ranking; CUDA; ~30 min for a 4-hr 1080p VOD; Celery web-worker mode. |
| `wAIfu-DEV/VodAutoClipper` | ~5 | GPL-3.0 | Twitch VOD: transcription + **chat activity** + OpenAI LLM scoring; pitch-based 2-speaker split; ~1 hr on RTX 2060. Rare example fusing chat+transcript+LLM. |
| `bendawg2010/Auto-clipper` | small | — | YOLO object detection + pixel analysis + "clip it" voice trigger; gamer-focused. |
| `nirvagold/stream-clipper` | small | — | Desktop app (Tauri+Rust+Svelte), audio + chat analysis. |
| `artkulak/twitch-stream-highlights-detection` | small | — | ML on sound+motion+chat features, real-time. |
| `teja156/autobot-clipper` | small | — | Harvests existing Twitch clips → auto-uploads to YouTube (curation, not detection). |
| Chat-only detectors | — | — | `joaohenggeler/twitch-chat-highlights`, `hougesen/twitch-highlight-finder`, `packsun/chatplot`, `dsteffan/twitch_chat_analysis`, `xurei/twitch-highlights-logger`, `DennisPing/Twitch-Autoclip`. |
| Building blocks | — | — | `lay295/TwitchDownloader` (VOD+chat JSON), `auto-highlighter-py` (loudness), WhisperX, PySceneDetect. |

No repo named "StreamSnipe" doing auto-clipping exists; `SurajBhari/streamsnip` is *manual* chat-command clipping (Nightbot `!clip`-style marks against the live VOD) — itself a useful ground-truth source. Star counts other than AI-Youtube-Shorts-Generator were not individually verified and are small (<100).

## 6. Commercial tools' described signals & recommended v1

- **OpusClip ClipAnything**: "visual, audio, and sentiment cues" per frame — objects/scenes/actions/sounds/emotions/on-screen text; facial expressions; narrative structure; speaker changes and topic transitions for breakpoints; prompt-driven moment finding; outputs 8–15 clips with a virality score. Marketed precisely as fixing transcript-only tools on gaming/sports.
- **Eklipse**: three layers — game-event reading from **frame graphics/kill feed/on-screen markers** (kills, clutches, round results, boss fights), scene-aware context, per-genre tuning; plus **voice pitch spikes/shouting** and **chat message velocity**; per-game training (Valorant aces etc.); "clip it" voice command; explicitly supports Twitch, **Kick**, YouTube. Their blog admits the old single-trigger (audio-spike) engine produced false positives — the same lesson for any v1.
- **Powder**: 40+ proprietary per-game vision models (Fortnite, Valorant, Apex, CoD, Rocket League, Fall Guys, Elden Ring, Among Us…) + laughter/emotion detection from voice + community/chat engagement tracking.
- **Vizard (Spark 1.0)**: a "video understanding LLM" over visuals+audio+story; keyword-prompt retrieval ("goal celebration"); speech/emotion/pacing analysis; content-aware scene understanding beyond silence detection.

**Recommended v1 pipeline (30-min VOD, practical/open-source):**
1. `ffmpeg` extract 16 kHz mono audio (seconds).
2. **faster-whisper large-v3-turbo, batched, VAD on** → segments + word timestamps (GPU: ~1–2 min; add WhisperX alignment if you cut on word boundaries).
3. **Audio energy track**: librosa RMS + peak/pitch on 1 s windows → per-stream z-score (~10 s).
4. **Chat track** (if available): TwitchDownloader JSON or Kick live capture → msgs/sec + emote-keyword density z-score, shifted −10 s (<5 s compute).
5. **Fusion**: per-10 s window `score = 0.4·chat_z + 0.3·audio_z + 0.3·keyword/laughter` (weights are a starting point; if no chat, re-normalize) → top ~20 non-overlapping peaks → expand each to transcript sentence boundaries, snap to nearest scene cut/silence.
6. **LLM rerank**: send each candidate's transcript ±30 s with the signal scores to **Claude Haiku 4.5** (screen) and **Sonnet 5** (final top-10 rerank + titles), JSON-schema structured output. ~$0.02–0.05 for a 30-min VOD; use the Batch API (−50%) for backlogs.
7. `ffmpeg -ss START -to END -c copy` per clip (seconds; re-encode only if trimming on non-keyframes matters).

**Total per 30-min VOD**: ~3–5 min wall-clock on an RTX 3060-class GPU (or ~$0.05–0.10 of rented L40S time), ~15–35 min CPU-only with turbo/distil models, plus $0.02–0.09 LLM spend. This matches or beats Clipception's ~30 min/4 hr reference point.

## Sources

- [faster-whisper releases (SYSTRAN)](https://github.com/SYSTRAN/faster-whisper/releases)
- [faster-whisper GPU production deployment guide (Spheron, 2026)](https://www.spheron.network/blog/faster-whisper-gpu-cloud-production-deployment-guide/)
- [whisper.cpp vs faster-whisper 2026 speed test](https://www.promptquorum.com/power-local-llm/local-whisper-stt-comparison-2026)
- [WhisperX (word-level timestamps & diarization)](https://github.com/m-bain/whisperX)
- [WhisperX word-timestamp accuracy vs MFA (issue #1247)](https://github.com/m-bain/whisperX/issues/1247)
- [Whisper Large V3 Turbo vs V3 benchmark](https://whispernotes.app/blog/introducing-whisper-large-v3-turbo)
- [AI-Youtube-Shorts-Generator (open-source OpusClip alternative)](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator)
- [Clipception (audio + Whisper + DeepSeek clip ranking)](https://github.com/msylvester/Clipception)
- [VodAutoClipper (transcript + chat + LLM)](https://github.com/wAIfu-DEV/VodAutoClipper)
- [Auto-clipper (YOLO + pixel analysis + voice trigger)](https://github.com/bendawg2010/Auto-clipper)
- [stream-clipper (Tauri desktop, audio+chat)](https://github.com/nirvagold/stream-clipper)
- [streamsnip (manual chat-command clipping)](https://github.com/SurajBhari/streamsnip)
- [twitch-chat-highlights (emote/word counting)](https://github.com/joaohenggeler/twitch-chat-highlights)
- [twitch-highlight-finder (chat frequency microservices)](https://github.com/hougesen/twitch-highlight-finder)
- [chatplot (chat concentration over time)](https://github.com/packsun/chatplot)
- [twitch_chat_analysis (messages/sec spikes)](https://github.com/dsteffan/twitch_chat_analysis)
- [twitch-highlights-logger](https://github.com/xurei/twitch-highlights-logger)
- [Twitch-Autoclip (SVM on chat text)](https://github.com/DennisPing/Twitch-Autoclip)
- [twitch-stream-highlights-detection (sound+motion+chat ML)](https://github.com/artkulak/twitch-stream-highlights-detection)
- [LIGHTOR: implicit crowdsourcing highlight extraction (arXiv)](https://arxiv.org/pdf/1910.12201)
- [Autohighlight: LoL esports highlights via crowd-sourced data](https://www.sciencedirect.com/science/article/pii/S2666827022000469)
- [Multimodal video-audio-chat fusion for e-sports highlights](https://www.sciencedirect.com/science/article/abs/pii/S156849462200480X)
- [Live Stream Highlight Detection Using Chat Messages](https://www.researchgate.net/publication/343522615_Live_Stream_Highlight_Detection_Using_Chat_Messages)
- [TwitchDownloader (VOD/chat JSON download)](https://github.com/lay295/TwitchDownloader)
- [Kick Dev Docs (official webhook API)](https://github.com/KickEngineering/KickDevDocs)
- [Kick chat reading discussion (KickDevDocs #214)](https://github.com/KickEngineering/KickDevDocs/discussions/214)
- [kick-js (unofficial Kick chat websocket, TS)](https://www.npmjs.com/package/@retconned/kick-js)
- [KickLib (C# Kick API + Pusher websocket)](https://github.com/Bukk94/KickLib)
- [Kicklet Kick chat downloader](https://kicklet.app/chat-downloader)
- [Streams Charts chat-logs downloader (Twitch/Kick/YouTube)](https://streamscharts.com/tools/chat-logs-downloader)
- [kick-save (Kick VOD + chat capture)](https://github.com/dknos/kick-save)
- [PySceneDetect](https://github.com/Breakthrough/PySceneDetect)
- [PySceneDetect detection algorithms docs](https://www.scenedetect.com/docs/0.6.3/api/detectors.html)
- [ffmpeg silencedetect filter docs](https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Audio/silencedetect.html)
- [ffmpeg filters documentation (astats, ebur128, loudnorm)](https://ffmpeg.org/ffmpeg-filters.html)
- [auto-highlighter-py (loudness-threshold VOD highlighter)](https://pypi.org/project/auto-highlighter-py)
- [Multi-modal highlight detection in broadcast audio (SciTePress 2026)](https://www.scitepress.org/Papers/2026/145852/145852.pdf)
- [OpusClip ClipAnything product page](https://www.opus.pro/clipanything)
- [What is ClipAnything (Opus help)](https://help.opus.pro/docs/article/9947095-clip-anything)
- [How OpusClip works and where it falls short (Sumella)](https://sumella.com/how-opusclip-works-and-where-it-still-falls-short/)
- [Eklipse: how gameplay intelligence works](https://blog.eklipse.gg/streaming-tips/how-gameplay-intelligence-works-2.html)
- [Eklipse AI highlights feature](https://eklipse.gg/features/ai-highlights/)
- [Powder AI clips feature](https://www.powder.gg/feature/ai-clips)
- [Vizard Spark 1.0 (video understanding LLM)](https://vizard.ai/spark)
- [What is Spark 1.0 (Vizard help)](https://help.vizard.ai/en/articles/9905409-what-is-spark-1-0)
- [Moment and highlight detection via MLLM frame segmentation (arXiv 2025)](https://arxiv.org/pdf/2512.12246)
- [SVHighlights: extremely long sport video highlight detection (arXiv 2026)](https://arxiv.org/pdf/2606.06926)
