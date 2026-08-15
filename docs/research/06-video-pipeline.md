# Research: video-pipeline

_Research date: 2026-08-15. API limits, prices, and policies below are time-sensitive — recheck official sources before hardcoding._

## Summary

For 2026, the standard pipeline is: native FFmpeg (7.x/8.x) spawned from Node via child_process, converting 16:9 VOD segments to 1080x1920 with one of three filtergraph patterns (center crop, blurred-pad, or crop+vstack facecam stack), burning ASS karaoke captions generated from Whisper word timestamps (faster-whisper/whisper.cpp/WhisperX), and overlaying a PNG or drawtext watermark inside the ~900x1400 cross-platform safe zone. fluent-ffmpeg was deprecated/archived in May 2025 and ffmpeg.wasm is ~10x slower than native, so shell out to a real binary; Remotion is the polished-but-paid alternative ($0.01/render, $100/mo minimum for automation once your company has 4+ people). A 30s 1080x1920 clip with burned subtitles renders in roughly 15-60s on a $5-12/mo 2-vCPU VPS with x264 veryfast, plus 5-60s for Whisper transcription depending on model.

## Key facts

- fluent-ffmpeg was officially deprecated May 15, 2025 and the repo archived May 22, 2025; npm package is marked deprecated. Best practice 2026: spawn the ffmpeg binary directly with child_process.spawn, or use a typed fork like @ts-ffmpeg/fluent-ffmpeg.
- ffmpeg-static npm (v5.3.0, updated Nov 14, 2025) still ships FFmpeg 6.1.1 — works but is behind current FFmpeg 7.x/8.x; on a VPS prefer distro ffmpeg or a BtbN/johnvansickle static build (johnvansickle builds compile with --enable-libass; note trac ticket #10705 where drawtext was missing from some static builds).
- ffmpeg.wasm (@ffmpeg/ffmpeg) is roughly 10x+ slower than native (measured: ~40fps vs 500+fps CLI on a 720p x264 encode; 1080p decode ~25fps) — unusable for a server-side clip pipeline.
- Remotion licensing (v5, 2026): free for individuals/companies with ≤3 employees; Creators plan $25/seat/month; Automators plan $0.01 per render with $100/month minimum; Enterprise from ~$500/month; telemetry is mandatory for company-license Automators starting with Remotion 5.0.
- Universal 9:16 safe zone for 1080x1920: keep critical text/graphics inside a centered ~900x1400 px block (conservative: 840x1300). TikTok-specific (Aug 2026 measurements): ~140px top, ~400px bottom, ~60px left, ~180px right (action rail). Reels: ~108-220px top, ~320-500px bottom. Shorts: bottom ~320px covered.
- Platform specs Aug 2026 — all three want 1080x1920 9:16 MP4, H.264 High profile + AAC, 30 or 60fps, yuv420p. TikTok: up to 60 min via web, mobile file caps ~287.6MB iOS / ~72MB Android, ~4-10GB web. Reels: 3 min is the algorithmic sweet spot (longer uploads accepted, up to ~15-20 min, but Reels >3 min aren't recommended to new audiences); ~650MB-4GB size caps reported. Shorts: ≤3 minutes to classify as a Short (expanded from 60s in Oct 2024); YouTube recommends 8 Mbps @1080p30 / 12 Mbps @1080p60, AAC-LC 384kbps 48kHz stereo.
- H.265/HEVC uploads are accepted by Instagram/YouTube but get transcoded to H.264/VP9/AV1 for delivery anyway — H.264 High profile remains the 2026 upload standard for all three platforms.
- Caption toolchain: Whisper word timestamps (faster-whisper with word_timestamps=True, whisper.cpp with --max-len 1, or WhisperX for <100ms phoneme-aligned accuracy) -> generate .ass with per-word events or {\k} karaoke tags -> burn with ffmpeg -vf "ass=subs.ass" or subtitles=subs.ass. force_style can restyle SRT (FontName, FontSize, PrimaryColour=&HAABBGGRR, Outline, Alignment, MarginV) but per-word highlight REQUIRES ASS override tags in the file itself.
- Ready-made caption tools 2025-2026: captacity (unconv, pip, Whisper+MoviePy, word highlighting — older/MoviePy-slow), pycaps (Python, CSS-styled animated subtitles, active 2025), Remotion template-tiktok + @remotion/captions createTikTokStyleCaptions() + @remotion/install-whisper-cpp, stable-ts (ASS karaoke output directly).
- Render time reality check (2-vCPU $5-12/mo VPS, no GPU): x264 -preset veryfast -crf 20 on 1080x1920@30 runs ~20-60fps, so a 30s clip = ~15-45s encode; blurred-background variant adds 30-50% (use boxblur, not gblur — gblur can double time); preset slow benchmark from LowEndTalk: 10-min 1080p took 15-25 min on a 2-core $5 VPS (~0.4-0.7x realtime). Whisper on 30s audio: tiny/base int8 ~5-20s, small ~15-60s on 2 vCPU. Budget ~1-3 min per clip end-to-end.
- Always output: -c:v libx264 -profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k (or 384k for YouTube) -ar 48000; even dimensions required; give platforms ~2x their delivery bitrate (or CRF 18-20) since all three re-encode.

## Gotchas

- fluent-ffmpeg is deprecated (May 2025) and archived — do not build new pipelines on it; the npm package still installs, which silently traps new projects.
- ffmpeg.wasm is ~10x+ slower than native and memory-capped — never use it server-side; it also can't use threads without COOP/COEP headers.
- force_style on the subtitles filter cannot do per-word karaoke highlighting — that requires ASS override tags ({\k}, \1c, \t) generated into the .ass file; also ASS FontSize scales with PlayResY, so always set PlayResX:1080/PlayResY:1920 or your sizes will be wrong.
- Headless VPS: libass/drawtext need fonts + fontconfig installed (fc-cache), and some static ffmpeg builds have shipped WITHOUT drawtext (trac #10705) — verify `ffmpeg -filters` in CI. ffmpeg-static npm still ships FFmpeg 6.1.1 (old).
- yuv420p and even dimensions are mandatory — odd crop/scale values make libx264 fail, and missing -pix_fmt yuv420p produces videos that look black/broken on phones.
- Safe-zone numbers are unofficial reverse-engineered measurements that shift with app updates (TikTok right rail ~180px, Reels bottom up to ~500px); never put the watermark bottom-right or on the right edge.
- TikTok Android in-app upload cap is only ~72MB — an automated pipeline should post via web/Content Posting API, not rely on mobile-size files.
- Reels longer than 3 minutes are excluded from recommendation to non-followers (kills clip reach); Shorts longer than 3 minutes stop being Shorts entirely.
- Uploading H.265 gains nothing — Instagram/YouTube transcode to H.264/VP9 anyway, and TikTok H.265 support is inconsistent; ship H.264 High.
- Remotion needs a paid Company License once the for-profit company has 4+ people ($0.01/render, $100/mo minimum for automation), and v5.0 makes telemetry mandatory for company-license Automators; its Chromium-based rendering is several times slower than pure ffmpeg on a VPS.
- Whisper hallucinates captions on game audio/music/silence — enable VAD (faster-whisper vad_filter=True) and cap segment length; whisper.cpp medium.en model is a 1.5GB download (Remotion template default).
- gblur is dramatically slower than boxblur on CPU for the blurred-background pattern; blur a downscaled copy then upscale to keep cheap-VPS render times sane.
- All platform numeric limits cited (file caps, durations, safe zones) are as of Aug 2026 and change frequently — treat as version-dependent and recheck before hardcoding validation limits.

## Full details

## 1. 16:9 → 9:16 conversion filtergraphs

All patterns target 1080x1920 output from a 1920x1080 (or 2560x1440) source. Always end with `setsar=1` and encode `yuv420p`.

### A. Center crop (fills frame, loses 66% of horizontal content)
```bash
ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920:flags=lanczos,setsar=1" \
  -c:v libx264 -profile:v high -preset veryfast -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart out.mp4
```
From a 1920x1080 source this crops a 608x1080 window (usually centered; shift the x offset to follow the action). Variant that tracks a fixed subject: replace the x expression with a constant, e.g. `crop=608:1080:400:0`.

### B. Blurred-background pad (keeps full 16:9 frame, "letterboxed" over its own blur)
```bash
ffmpeg -i in.mp4 -filter_complex \
"[0:v]split=2[bg][fg]; \
 [bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920, \
     boxblur=luma_radius=min(h\,w)/20:luma_power=1:chroma_radius=min(cw\,ch)/20:chroma_power=1, \
     eq=brightness=-0.05[bgb]; \
 [fg]scale=1080:-2:flags=lanczos[fgs]; \
 [bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1[v]" \
 -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
 -c:a aac -b:a 192k -movflags +faststart out.mp4
```
`gblur=sigma=20` looks smoother than `boxblur` but is noticeably slower on CPU — on a cheap VPS use `boxblur` (or `scale=270:480,boxblur=10,scale=1080:1920` — blur at low res then upscale, which is much cheaper and looks identical). The 16:9 inset lands at y=606..1314, safely inside every platform's UI.

### C. Facecam-on-top / gameplay-below stack (the standard streamer layout)
You must know the facecam rectangle in the source (fixed per stream overlay layout — store it per-streamer as config). Example: facecam occupies 420x236 at (1470,30) in a 1920x1080 VOD; 40/60 split (768px cam + 1152px game = 1920):
```bash
ffmpeg -i vod.mp4 -filter_complex \
"[0:v]crop=420:236:1470:30,scale=1080:768:flags=lanczos,setsar=1[cam]; \
 [0:v]crop=1296:864:312:108,scale=1080:1152:flags=lanczos,setsar=1[game]; \
 [cam][game]vstack=inputs=2[v]" \
 -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
 -c:a aac -b:a 192k -movflags +faststart out.mp4
```
Rules: the two segment widths must both be 1080, heights must sum to 1920, and every crop/scale dimension must be even. Keep the crop aspect equal to the scale aspect to avoid stretching (crop 1296x864 = 3:2, scale 1080x720 would be 3:2 — if you want 1080x1152 (15:16), crop a 15:16 region of the gameplay instead, e.g. `crop=1012:1080:454:0,scale=1080:1152`). Common splits used by clip tools in 2026: 40/60 (cam 768 / game 1152) or 30/70 (576/1344). 2026 guides (Clypse, StreamClipping) confirm facecam-top-40%/gameplay-bottom-60% at 1080x1920 as the convention.

## 2. Burned-in animated captions (Whisper → ASS → libass)

### Pipeline
1. Extract audio: `ffmpeg -i clip.mp4 -ar 16000 -ac 1 -c:a pcm_s16le audio.wav`
2. Word timestamps:
   - **faster-whisper** (CTranslate2, best CPU perf): `model.transcribe(audio, word_timestamps=True, vad_filter=True)` — VAD matters for stream audio (game sound/music triggers hallucinations).
   - **whisper.cpp**: `--max-len 1` yields one word per segment; also has JSON output with token timestamps. This is what Remotion's tooling wraps.
   - **WhisperX**: wav2vec2 phoneme alignment → <100ms word accuracy, the best choice when karaoke highlight must be frame-tight.
   - **stable-ts**: can emit karaoke ASS directly (`result.to_ass(karaoke=True)`).
3. Generate `.ass`. Set `PlayResX: 1080 / PlayResY: 1920` so all coordinates/font sizes are in output pixels.
4. Burn: `ffmpeg -i clip.mp4 -vf "ass=captions.ass" -c:a copy out.mp4` (the `ass` filter; `subtitles=` also works and additionally accepts SRT + `force_style`).

### ASS mechanics for TikTok-style captions
- Karaoke tags: `{\k30}` (duration in **centiseconds**) fills the word with `SecondaryColour`→`PrimaryColour`; `{\kf}` sweeps; per-word color pop is usually done instead with one Dialogue event per "page" plus inline color overrides, or one event per word.
- TikTok style = 1-4 word "pages", huge bold font, heavy outline, centered around 60-70% of frame height:
```
[Script Info]
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat ExtraBold,110,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,0,2,60,60,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.20,0:00:01.62,Cap,,0,0,0,,{\fad(40,0)\t(0,120,\fscx110\fscy110)\t(120,240,\fscx100\fscy100)}NEVER
Dialogue: 0,0:00:01.62,0:00:02.05,Cap,,0,0,0,,{\1c&H00D7FF&}GONNA
Dialogue: 0,0:00:02.05,0:00:02.40,Cap,,0,0,0,,{\k18}GIVE {\k22}YOU {\k20}UP
```
(`&HAABBGGRR` color order — `&H00D7FF&` is gold; `MarginV=560` with Alignment=2 puts text ~y=1360, clear of Reels' bottom 500px UI zone.)
- `force_style` (SRT route) can set FontName/FontSize/PrimaryColour/OutlineColour/Outline/Shadow/Bold/Alignment/MarginV, e.g. `subtitles=subs.srt:force_style='FontName=Montserrat ExtraBold,FontSize=20,Outline=3,Bold=-1,Alignment=2,MarginV=90'` — but it CANNOT do per-word highlighting; that requires override tags inside an ASS file. FontSize under force_style is scaled relative to the file's PlayRes, another reason to generate real ASS with PlayRes 1080x1920.
- Headless VPS gotcha: libass needs fontconfig + installed fonts (`apt install fontconfig`, drop TTFs in `/usr/share/fonts`, run `fc-cache -f`), or pass `:fontsdir=/app/fonts` to the filter.

### Ready-made tools (2025-2026)
- **captacity** (github.com/unconv/captacity): `pip install captacity`; Whisper (local or API) + MoviePy; word highlight, font/stroke/shadow config. Works but MoviePy compositing is slow; project is largely 2023-24 vintage.
- **pycaps** (github.com/francozanardi/pycaps): active 2025; CSS-styled, animated subtitle rendering in Python — the most flexible pure-Python option.
- **Remotion template-tiktok** (github.com/remotion-dev/template-tiktok): `@remotion/install-whisper-cpp` (auto-downloads whisper.cpp + medium.en 1.5GB model, configurable in whisper-config.mjs) → `toCaptions()` → `@remotion/captions` `createTikTokStyleCaptions({combineTokensWithinMilliseconds})` for page grouping → React/CSS animation. Best-looking output; slowest render (Chromium screenshots each frame) and license cost applies (see §5).
- **auto-captions** (nikhil-reddy05), Whisper-TikTok (MatteoFasulo) — simpler Whisper+FFmpeg ASS burners.

## 3. Watermark / branding ("Kick.com/WinslowBankz")

**drawtext** (needs build with libfreetype; some static builds have shipped without it — ffmpeg trac #10705):
```
drawtext=text='Kick.com/WinslowBankz':fontfile=/app/fonts/Montserrat-Bold.ttf:fontsize=38:fontcolor=white@0.55:borderw=2:bordercolor=black@0.35:x=(w-text_w)/2:y=170
```
**PNG overlay** (preferred for brand consistency — exact logo, pre-rendered antialiasing; control opacity with colorchannelmixer):
```bash
ffmpeg -i clip.mp4 -i wordmark.png -filter_complex \
"[1:v]format=rgba,colorchannelmixer=aa=0.6[wm];[0:v][wm]overlay=x=(W-w)/2:y=170:format=auto" ...
```
Verdict: PNG overlay for the logo/wordmark (render it once at exact pixel size, e.g. 500x80), drawtext only for dynamic text (clip titles, dates). Both cost almost nothing at encode time.

**Placement vs platform UI (1080x1920, 2026 measurements — unofficial, drift with app versions):**
- TikTok: top ~140px (username/following-for-you tabs), bottom ~400px (caption+audio+progress), left ~60px, right ~180px (like/comment/share action rail). Source measured Aug 12, 2026.
- Instagram Reels: top ~108-220px, bottom ~320-500px (caption, audio attribution, comment teaser — worst bottom of the three), sides ~60px.
- YouTube Shorts: bottom ~320px (title/channel/subscribe), right rail similar to TikTok; central 1080x1440 (4:5) is the safe core.
- **Cross-platform rule**: keep everything important in a centered ~900x1400 block; conservative 840x1300 (also survives IG's 4:5 feed crop). Practical watermark spots: top-center at y≈150-180, or left side at x=70 vertically centered. Never bottom-right (all three platforms) or right edge (action rails).

## 4. Per-platform output specs (Aug 2026)

| | TikTok | IG Reels | YT Shorts |
|---|---|---|---|
| Resolution | 1080x1920 (9:16) | 1080x1920 | 1080x1920 (accepts up to 4K vertical) |
| Max duration | 10 min in-app record; **60 min via web upload** | 3 min in-app record (since Jan 2025); uploads up to ~15-20 min accepted, but **Reels >3 min aren't recommended to new audiences** | **≤3 min to classify as a Short** (since Oct 15, 2024) |
| FPS | 30 (talking) / 60 (high motion) | 30 standard, 60 ok | 24-60; recommend 30 or 60 |
| Codec | H.264 High + AAC in MP4/MOV (WebM ok on web) | H.264 + AAC in MP4 (H.265 accepted but transcoded to H.264) | H.264 High + AAC-LC in MP4 |
| Bitrate | 8-12 Mbps | ~3.5-10 Mbps | YouTube official rec: 8 Mbps @1080p30, 12 Mbps @1080p60 SDR |
| Max file | ~287.6MB iOS app / ~72MB Android app / ~4-10GB web | ~650MB (<10 min) up to ~3.6-4GB | 256GB (general YouTube cap) |
| Audio | AAC stereo, 128-256kbps, 44.1/48kHz | AAC stereo 128-256kbps | AAC-LC 48kHz stereo, official rec 384kbps |

Universal render target: `1080x1920, 30fps, H.264 High profile, yuv420p, CRF 18-20 (or 10-12 Mbps 2-pass), AAC 192-256k 48kHz, +faststart`. One render works everywhere; optionally a 1440x2560 ~16-20 Mbps variant for Shorts (YouTube's transcoder rewards it visibly). All three platforms re-encode aggressively — feed them ~2x delivery bitrate. Add `loudnorm=I=-14:TP=-1.5:LRA=11` for platform-normalized audio. These numbers are stable as of Aug 2026 but the mobile file caps and duration tiers change frequently — recheck quarterly.

## 5. Node.js tooling (2026)

- **fluent-ffmpeg: DEAD.** Deprecated May 15, 2025 (issue #1324), repo archived May 22, 2025, npm package flagged deprecated. Maintainer njoyard: it's "just a fancy command-line generator," recommends direct ffmpeg usage. Forks exist (`@ts-ffmpeg/fluent-ffmpeg`); new wrappers: `mediaforge`, `kiss-ffmpeg` — none is yet a de-facto standard.
- **2026 best practice: `child_process.spawn('ffmpeg', args)`** with an args array (no shell quoting bugs), parse `-progress pipe:1` for progress, cap concurrency to vCPU count. Build the filtergraph as a template string.
- **ffmpeg-static** (npm, v5.3.0, updated Nov 14, 2025): still maintained, but ships **FFmpeg 6.1.1** — fine for this pipeline, yet behind 7.x/8.x. On a VPS/Docker prefer `apt install ffmpeg` (Debian 13 → 7.x) or a BtbN/johnvansickle static build; johnvansickle builds are `--enable-libass`. Verify `ffmpeg -filters | grep -E 'drawtext|subtitles|ass'` at deploy time (trac #10705: drawtext missing from some static builds).
- **@ffmpeg/ffmpeg (wasm): not for servers.** Benchmarks: ~40fps vs 500+fps native on a 720p x264 job; 1080p decode ~25fps; needs SharedArrayBuffer/COOP-COEP for threads; ~2-4GB memory ceiling. It exists for in-browser use only.
- **Remotion**: React-based programmatic video, renders via headless Chromium. Licensing (v5.0, 2026): free for individuals/≤3-employee companies/nonprofits; **Creators $25/seat/mo**; **Automators $0.01/render, $100/mo minimum** (this is the plan an automated clip pipeline falls under once the company has 4+ people); Enterprise from ~$500/mo; 1 render = 1 successfully generated video; cloud infra costs separate; **telemetry mandatory for company-license Automators from v5.0**. Render speed: frame-by-frame browser screenshots — typically well under realtime on CPU (minutes for a 30s comp on a small VPS); Remotion Lambda parallelizes to seconds but adds AWS cost. Verdict for this pipeline: pure FFmpeg for crop/stack/captions/watermark is ~10x cheaper and faster; Remotion only pays off if you want complex animated brand motion graphics, and its template-tiktok caption system is the nicest-looking off-the-shelf option.

## 6. Render-time expectations — 30s 1080x1920@30fps clip, cheap VPS, no GPU

Reference points: LowEndTalk — 2-core $5 VPS, 10-min 1080p, `-preset slow -crf 23` ≈ 15-25 min (0.4-0.7x realtime); veryfast is roughly 3-5x faster than slow; 2026 guidance confirms core count is the dominant variable.

On a 2-vCPU shared VPS (Hetzner CPX11 ~€5, DO $6-12):
- Center-crop or vstack + ASS burn + overlay, `libx264 -preset veryfast -crf 20`: **~20-60fps encode → 15-45s wall** for the 30s clip.
- Blurred-background variant: +30-50% with boxblur (blur-at-low-res trick keeps it cheap); gblur can double total time — avoid on CPU.
- `-preset medium`: 2-3x slower; only worth it if you're bitrate-constrained.
- Whisper on the 30s audio (2 vCPU, faster-whisper int8): tiny/base **5-20s**, small **15-60s**; whisper.cpp base.en comparable. medium is not practical on 2 vCPU (several minutes).
- **End-to-end budget: ~1-3 minutes per clip** (download+probe+transcribe+render). A 4-8 dedicated-vCPU box (Hetzner CCX23 ~€25/mo) brings encode to ≥ realtime and Whisper-small to ~0.3x clip length, i.e. ~30-60s per clip total.
- Queue clips serially or at most n_jobs = vCPUs/2; x264 already multithreads.

Suggested baseline command skeleton (all pieces combined):
```bash
ffmpeg -y -ss <start> -to <end> -i vod.mp4 -i wordmark.png -filter_complex \
"[0:v]crop=420:236:1470:30,scale=1080:768,setsar=1[cam]; \
 [0:v]crop=1012:1080:454:0,scale=1080:1152,setsar=1[game]; \
 [cam][game]vstack=2[stack]; \
 [1:v]format=rgba,colorchannelmixer=aa=0.6[wm]; \
 [stack][wm]overlay=(W-w)/2:170,ass=captions.ass[v]; \
 [0:a]loudnorm=I=-14:TP=-1.5[a]" \
-map "[v]" -map "[a]" -c:v libx264 -profile:v high -preset veryfast -crf 19 \
-pix_fmt yuv420p -r 30 -g 60 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out.mp4
```

## Sources

- [FFmpeg blurred-background vertical conversion examples (gist)](https://gist.github.com/ddennis/45f35675431fb5707ac0afc52a513f9d)
- [videoalchemy: convert a video to vertical (ffmpeg commands)](https://github.com/viddotech/videoalchemy/blob/main/docs/ffmpeg-commands/convert-a-video-to-vertical.md)
- [Clypse: How to Make Vertical Gaming Clips with Facecam (2026)](https://clypse.ai/blog/how-to-make-vertical-gaming-clips-facecam-2026)
- [StreamClipping: Vertical 9:16 clips — crop, facecam framing guide](https://streamclipping.ai/blog/clip-vertical-9-16-guide)
- [captacity — Add Automatic Captions to YouTube Shorts with AI](https://github.com/unconv/captacity)
- [pycaps — animated video subtitles with Python and CSS](https://github.com/francozanardi/pycaps)
- [Remotion template-tiktok — TikTok-style captions with Whisper.cpp](https://github.com/remotion-dev/template-tiktok)
- [Remotion createTikTokStyleCaptions() docs](https://www.remotion.dev/docs/captions/create-tiktok-style-captions)
- [WhisperX word timestamps + alignment guide](https://localaimaster.com/blog/whisperx-guide)
- [FFmpeg subtitles filter reference (force_style, ASS burn)](https://www.ffmpeg-micro.com/blog/ffmpeg-subtitles-filter-guide)
- [Kreatli Safe Zone Hub 2026 (Reels/TikTok/Shorts margins)](https://kreatli.com/guides/safe-zone-guide)
- [CreaMate: TikTok Safe Zone in 2026 (verified Aug 12, 2026)](https://creamate.ai/en/blog/tiktok-safe-zone-guide)
- [Syllaby: Aspect Ratios & Safe Zones for Shorts, Reels and TikTok](https://syllaby.io/blog/aspect-ratios-safe-zones-shorts-reels-tiktok/)
- [Social Media Video Specs 2026 (veopro)](https://veopro.ai/blog/social_media_video_specs_2026)
- [TikTok Video Size Limits 2026 (filesize.org)](https://filesize.org/limits/tiktok/)
- [YouTube recommended upload encoding settings (official)](https://support.google.com/youtube/answer/1722171?hl=en)
- [Instagram Reels length limits 2026 (SellerPic)](https://www.sellerpic.ai/blog/instagram-reel-size)
- [Phasing out fluent-ffmpeg — Issue #1324](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/1324)
- [ffmpeg-static (npm)](https://www.npmjs.com/package/ffmpeg-static)
- [ffmpeg.wasm performance docs/issues (transcoding too slow #70)](https://github.com/ffmpegwasm/ffmpeg.wasm/issues/70)
- [Remotion License FAQ (pricing, seats, renders, telemetry)](https://www.remotion.dev/docs/license/faq)
- [LowEndTalk: cheap VPS ffmpeg encoding benchmarks](https://lowendtalk.com/discussion/104376/cheap-vps-or-server-for-encoding)
- [FFmpeg trac #10705 — drawtext filter missing in static build](https://trac.ffmpeg.org/ticket/10705)
- [John Van Sickle FFmpeg static builds (libass-enabled)](https://johnvansickle.com/ffmpeg/)
