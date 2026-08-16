/** Job + shared types for the worker runner. Clip/moment types live in the
 *  engine (worker/engine/types.ts). */

export type Platform = "tiktok" | "youtube" | "instagram";

/** Enqueued by the web app when a Kick stream ends (or a VOD is uploaded). */
export interface ProcessStreamJob {
  tenantId: string;
  streamId: string;
  /** Local path or object-store key of the recorded broadcast. */
  sourcePath: string;
  channelSlug: string;
  /** Live-captured chat message timestamps (seconds from stream start). */
  chatTimestamps?: number[];
  styleHint?: string;
}
