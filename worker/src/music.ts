/**
 * Music safety gate. Every clip is checked for claimed music before it posts —
 * flagged moments are skipped or stripped, so customer accounts don't rack up
 * strikes/mutes. There is no "safe duration" (docs/research/10).
 *
 * Pipeline: cheap music-presence classifier (YAMNet) gates a fingerprint lookup
 * (AudD/ACRCloud); if a commercial track is found, skip (music-dominant) or
 * strip with Demucs and re-scan (speech-dominant).
 */

export interface MusicVerdict {
  flagged: boolean;
  track?: string;
  action: "clean" | "skip" | "strip";
}

/** TODO: YAMNet music-presence → AudD fingerprint over the clip's audio. */
export async function detectMusic(_clipAudioPath: string): Promise<MusicVerdict> {
  // Fail safe: until wired, treat as clean but log — flip to conservative
  // (skip on any music) once the classifier is connected.
  return { flagged: false, action: "clean" };
}

/** TODO: Demucs htdemucs to remove the music stem; re-scan the result. */
export async function stripMusic(_inPath: string, outPath: string): Promise<string> {
  throw new Error("stripMusic not wired: run Demucs and re-fingerprint the output");
  return outPath;
}
