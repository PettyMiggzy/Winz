/** Shared job + domain types for the worker. Mirrors the web app's Prisma shapes. */

export type Platform = "tiktok" | "youtube" | "instagram";

/** Enqueued by the web app when a Kick stream ends (or a VOD is uploaded). */
export interface ProcessStreamJob {
  tenantId: string;
  streamId: string;
  /** Local path or object-store key of the recorded broadcast. */
  sourcePath: string;
  channelSlug: string;
  watermark: string; // e.g. "kick.com/WinslowBankz"
  /** Live-captured chat message timestamps (seconds from stream start). */
  chatTimestamps?: number[];
}

export interface DetectedMoment {
  startSec: number;
  endSec: number;
  anchorSec: number;
  score: number; // fused signal score
  signals: string[];
}

export interface ScoredClip extends DetectedMoment {
  title: string;
  hook: string;
  llmScore: number; // 0-100 virality
  transcript: string;
  flaggedMusic: boolean;
}
