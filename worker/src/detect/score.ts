/**
 * LLM scoring + hook/title generation for a candidate moment. Feeds the
 * transcript window to Claude Haiku and gets back a virality score + a
 * scroll-stopping title and hook (docs/research/05, 12, 26).
 */

import { config } from "../config.js";

export interface ClipScore {
  score: number; // 0-100 virality
  title: string; // platform-ready caption/title
  hook: string; // 1-line scroll-stopper
}

export const SCORING_SYSTEM = `You score short livestream moments for viral potential on TikTok/Shorts/Reels.
Given a transcript window, rate 0-100 on hook strength, emotion, humor, conflict, and quotability, and
write ONE punchy title (<=60 chars, keyword first) and ONE first-second hook. Avoid engagement-bait
phrases ("comment below", "watch till the end") — those are policy-risky. Return strict JSON:
{"score": <int>, "title": "<string>", "hook": "<string>"}.`;

/**
 * TODO: call the Anthropic SDK (config.anthropic.model) with SCORING_SYSTEM and
 * the transcript window; parse the JSON. Use the Batch API for backlog VODs
 * (50% cheaper, ~$0.03/VOD-hour). Kept as an interface for now.
 */
export async function scoreMoment(_transcriptWindow: string): Promise<ClipScore> {
  if (!config.anthropic.apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  throw new Error("scoreMoment not wired: call the Anthropic SDK with SCORING_SYSTEM");
}
