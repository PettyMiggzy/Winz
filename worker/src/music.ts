/**
 * Music safety gate.
 *
 * Clips cut from a stream routinely carry whatever the streamer was playing,
 * and posting that to a creator's TikTok or Reels account is how they collect
 * mutes and strikes. This screens each rendered clip against AudD's
 * fingerprint database and reports what it finds.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It does not silently pass when it can't check. Without AUDD_API_KEY, or
 *    when the lookup fails, the verdict comes back `checked: false` and that
 *    travels to the review queue, so a creator is never shown an unscreened
 *    clip that looks screened. An unchecked clip is not a clean clip.
 *
 *  - It does not, by default, throw the clip away. Nothing auto-posts without
 *    human approval, so the useful move is to name the track and let the
 *    creator decide. Set MUSIC_POLICY=skip to drop flagged clips instead.
 *
 * Stripping the music stem (Demucs) isn't implemented; a flagged clip is a
 * decision for a person, not something we silently rewrite.
 */
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../engine/ffmpeg.ts";

const AUDD_ENDPOINT = process.env.AUDD_BASE_URL ?? "https://api.audd.io/";
/** AudD's standard endpoint rejects anything over 10 MB. */
const MAX_SAMPLE_BYTES = 9 * 1024 * 1024;
/** Seconds of audio to fingerprint. AudD needs a few; clips are short anyway. */
const SAMPLE_SEC = 25;

export type MusicAction = "clean" | "flag" | "skip";

export interface MusicVerdict {
  /** A commercial recording was identified in this clip. */
  flagged: boolean;
  /** Whether a lookup actually happened. False = unknown, NOT clean. */
  checked: boolean;
  /** "Artist — Title" when identified. */
  track?: string;
  action: MusicAction;
}

const apiKey = () => process.env.AUDD_API_KEY;

/** Whether clips are screened at all. Logged at boot so it's never a surprise. */
export const musicScreeningEnabled = (): boolean => Boolean(apiKey());

/** What a hit does: flag it for the creator (default), or drop the clip. */
const policy = (): MusicAction => (process.env.MUSIC_POLICY === "skip" ? "skip" : "flag");

const unchecked: MusicVerdict = { flagged: false, checked: false, action: "clean" };

interface AudDResponse {
  status?: string;
  result?: { artist?: string; title?: string; album?: string } | null | unknown[];
  error?: { error_code?: number; error_message?: string };
}

/**
 * Read AudD's answer. Pure, so the branch that decides whether a creator's
 * account is at risk is testable without an API key or a network.
 */
export function interpretAudD(json: AudDResponse, onHit: MusicAction): MusicVerdict {
  if (json.error) {
    // A quota or auth failure is not evidence the clip is clean.
    return unchecked;
  }
  if (json.status !== "success") return unchecked;

  // AudD returns null OR an empty array for "no match" — both mean the lookup
  // ran and found nothing, which is a real clean result.
  const r = json.result;
  if (r === null || r === undefined || Array.isArray(r)) {
    return { flagged: false, checked: true, action: "clean" };
  }
  const hit = r as { artist?: string; title?: string };
  const title = (hit.title ?? "").trim();
  const artist = (hit.artist ?? "").trim();
  if (!title && !artist) {
    // Matched something it can't name — treat as unknown rather than inventing
    // a clean verdict or a nameless warning.
    return unchecked;
  }
  return {
    flagged: true,
    checked: true,
    track: [artist, title].filter(Boolean).join(" — "),
    action: onHit,
  };
}

/** 44.1 kHz mono MP3 of the clip's opening — small, but wide enough to fingerprint. */
async function extractSample(clipPath: string, outFile: string): Promise<void> {
  await run("ffmpeg", [
    "-y", "-v", "error",
    "-i", clipPath,
    "-t", String(SAMPLE_SEC),
    "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k",
    outFile,
  ]);
}

/** Screen one rendered clip. Never throws — an outage must not stop clipping. */
export async function detectMusic(clipPath: string): Promise<MusicVerdict> {
  const key = apiKey();
  if (!key) return unchecked;

  const dir = await mkdtemp(join(tmpdir(), "winclipz-music-"));
  try {
    const sample = join(dir, "sample.mp3");
    await extractSample(clipPath, sample);
    const bytes = await readFile(sample);
    if (bytes.length > MAX_SAMPLE_BYTES) {
      console.warn(`[music] sample too large (${bytes.length} bytes) — skipping lookup`);
      return unchecked;
    }

    const form = new FormData();
    form.append("api_token", key);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }), "sample.mp3");

    const res = await fetch(AUDD_ENDPOINT, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`[music] AudD returned ${res.status} — clip left unscreened`);
      return unchecked;
    }
    const verdict = interpretAudD((await res.json()) as AudDResponse, policy());
    if (verdict.flagged) console.warn(`[music] flagged: ${verdict.track}`);
    return verdict;
  } catch (e) {
    console.warn("[music] screening failed — clip left unscreened:", e instanceof Error ? e.message : e);
    return unchecked;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
