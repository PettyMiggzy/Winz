/**
 * The clip pipeline orchestrator. Ties the (tested, pure) detection + render
 * logic together with the external stages (transcription, LLM scoring, music
 * gate, publish). External stages are interfaces so this flow is inspectable
 * without ffmpeg/whisper/API keys present.
 *
 *   source ──▶ audio+RMS ──▶ transcribe ──▶ detect (audio+chat+transcript)
 *          ──▶ fuse candidates ──▶ [per top moment] LLM score ──▶ music gate
 *          ──▶ render 9:16 + captions + watermark ──▶ hand off to publish
 */

import { detectPeaks } from "./detect/audio.js";
import { detectChatSpikes } from "./detect/chat.js";
import { buildCandidates, type SignalPeak } from "./detect/fusion.js";
import { buildAss, type Word } from "./ffmpeg/captions.js";
import { runRender } from "./ffmpeg/render.js";
import { transcribe, type Transcript } from "./transcribe.js";
import { scoreMoment } from "./detect/score.js";
import { detectMusic } from "./music.js";
import { config } from "./config.js";
import type { ProcessStreamJob, ScoredClip } from "./types.js";

export async function processStream(job: ProcessStreamJob): Promise<ScoredClip[]> {
  const durationSec = await probeDuration(job.sourcePath);
  const audioPath = await extractAudio(job.sourcePath);
  const rms = await extractRmsSeries(job.sourcePath); // 1 Hz energy series
  const transcript = await transcribe(audioPath);

  // --- detect signals (pure, tested) ---
  const audioPeaks: SignalPeak[] = detectPeaks(rms, { hz: 1, zThreshold: 2 }).map((p) => ({
    tSec: p.tSec, weight: p.z, kind: "audio",
  }));
  const chatPeaks: SignalPeak[] = detectChatSpikes(job.chatTimestamps ?? [], { durationSec }).map((p) => ({
    tSec: p.tSec, weight: p.z, kind: "chat",
  }));
  const candidates = buildCandidates([...audioPeaks, ...chatPeaks], { streamDurationSec: durationSec });

  const clips: ScoredClip[] = [];
  for (const c of candidates.slice(0, config.maxClipsPerStream)) {
    const windowText = transcriptText(transcript, c.startSec, c.endSec);
    const scored = await scoreMoment(windowText); // title + hook + virality

    // music gate before spending a render
    const music = await detectMusic(audioPath);
    if (music.action === "skip") continue;

    // captions: word timestamps rebased to the clip start
    const words: Word[] = transcript.words
      .filter((w) => w.start >= c.startSec && w.end <= c.endSec)
      .map((w) => ({ text: w.text, start: w.start - c.startSec, end: w.end - c.startSec }));
    const assPath = await writeAss(buildAss(words), job.streamId, c.anchorSec);

    const output = clipPath(job.streamId, c.anchorSec);
    await runRender({
      input: job.sourcePath,
      output,
      startSec: c.startSec,
      endSec: c.endSec,
      platform: "tiktok", // per-account platform is assigned by the scheduler
      layout: "blur",
      watermark: job.watermark,
      assPath,
      fontFile: config.fontFile,
      ffmpegPath: config.ffmpegPath,
    });

    clips.push({
      ...c,
      title: scored.title,
      hook: scored.hook,
      llmScore: scored.score,
      transcript: windowText,
      flaggedMusic: music.flagged,
    });
  }
  // TODO: persist clips to the DB (status PENDING) and enqueue publish jobs
  // per assigned account with the warm-up ramp cadence applied.
  return clips;
}

function transcriptText(t: Transcript, startSec: number, endSec: number): string {
  return t.words.filter((w) => w.start >= startSec && w.end <= endSec).map((w) => w.text).join(" ");
}

// --- external stages to wire on the host (ffmpeg/ffprobe present) ---
async function probeDuration(_src: string): Promise<number> {
  throw new Error("probeDuration not wired: ffprobe -show_entries format=duration");
}
async function extractAudio(_src: string): Promise<string> {
  throw new Error("extractAudio not wired: ffmpeg -vn -ar 16000 -ac 1 out.wav");
}
async function extractRmsSeries(_src: string): Promise<number[]> {
  throw new Error("extractRmsSeries not wired: ffmpeg astats/ebur128 → 1Hz energy series");
}
async function writeAss(_ass: string, _streamId: string, _anchor: number): Promise<string> {
  throw new Error("writeAss not wired: write the .ass to config.workDir and return its path");
}
function clipPath(streamId: string, anchor: number): string {
  return `${config.workDir}/${streamId}/${Math.round(anchor)}.mp4`;
}
