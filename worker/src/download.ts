/**
 * Fetch a stream's source to a local file. Two cases:
 *  - Direct media (our R2 uploads, or a URL ending in a video extension):
 *    plain HTTP download.
 *  - A platform link (YouTube, Twitch, Kick, TikTok, …): resolve + download
 *    with yt-dlp (bundled in the worker image), merging to mp4.
 */
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const MEDIA_EXT = /\.(mp4|mov|webm|mkv|m4v)(\?|$)/i;
const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";

/** A URL we can just GET (already a media file), vs. a page yt-dlp must resolve. */
function isDirectMedia(url: string): boolean {
  if (MEDIA_EXT.test(url)) return true;
  const host = safeHost(url);
  // Our own R2 storage always serves a direct object.
  return (
    host.endsWith(".r2.dev") ||
    host.endsWith(".r2.cloudflarestorage.com") ||
    (process.env.R2_PUBLIC_BASE_URL ? url.startsWith(process.env.R2_PUBLIC_BASE_URL) : false)
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

async function directDownload(url: string, outPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch source ${res.status}`);
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
}

function ytdlpDownload(url: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // bv*+ba/b → best video+audio, fall back to best single file; merge to mp4.
    const args = [
      "-f", "bv*+ba/b",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-progress",
      "--retries", "3",
      "-o", outPath,
      url,
    ];
    const p = spawn(YTDLP, args, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("error", (e) =>
      reject(new Error(`yt-dlp failed to start (${e.message}); is it installed?`)),
    );
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code} for ${safeHost(url)}`)),
    );
  });
}

/** Download `url` to `outPath`, choosing direct fetch or yt-dlp automatically. */
export async function downloadSource(url: string, outPath: string): Promise<void> {
  if (isDirectMedia(url)) {
    await directDownload(url, outPath);
  } else {
    await ytdlpDownload(url, outPath);
  }
}
