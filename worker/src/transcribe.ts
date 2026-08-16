/**
 * Transcription with word timestamps. Two backends:
 *  - local: faster-whisper (Python sidecar), VAD on to avoid hallucinations
 *  - groq:  whisper-large-v3-turbo hosted (~$0.04/audio-hour)
 * See docs/research/05-highlight-detection.md.
 */

import type { Word } from "./ffmpeg/captions.js";
import { config } from "./config.js";

export interface Transcript {
  text: string;
  words: Word[];
}

export async function transcribe(audioPath: string): Promise<Transcript> {
  if (config.whisper.mode === "groq") return transcribeGroq(audioPath);
  return transcribeLocal(audioPath);
}

/**
 * TODO: spawn the Python faster-whisper sidecar (py/transcribe.py) with
 * word_timestamps=True and vad_filter=True; parse its JSON stdout into Word[].
 * Kept as an interface so the pipeline and its tests don't depend on Python.
 */
async function transcribeLocal(_audioPath: string): Promise<Transcript> {
  throw new Error("transcribeLocal not wired: run the faster-whisper sidecar (py/transcribe.py)");
}

/** TODO: POST the audio to Groq's transcription endpoint; map segments→Word[]. */
async function transcribeGroq(_audioPath: string): Promise<Transcript> {
  if (!config.whisper.groqKey) throw new Error("GROQ_API_KEY not set");
  throw new Error("transcribeGroq not wired yet");
}
