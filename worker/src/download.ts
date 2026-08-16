/**
 * Fetch a stream's source to a local file. Two cases:
 *  - Direct media (our R2 uploads, or a URL ending in a video extension):
 *    plain HTTP download.
 *  - A platform link (YouTube, Twitch, Kick, TikTok, …): resolve + download
 *    with yt-dlp (bundled in the worker image), merging to mp4.
 */
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MEDIA_EXT = /\.(mp4|mov|webm|mkv|m4v)(\?|$)/i;
const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";

/**
 * Optional cookies for sites that bot-check datacenter IPs (YouTube's "Sign in
 * to confirm you're not a bot"). Set YTDLP_COOKIES_B64 to a base64-encoded
 * Netscape cookies.txt (export with a "Get cookies.txt" browser extension).
 */
let cookiesPath: string | null | undefined; // undefined = not yet materialized
async function cookiesFile(): Promise<string | null> {
  if (cookiesPath !== undefined) return cookiesPath;
  const b64 = process.env.YTDLP_COOKIES_B64;
  if (!b64) return (cookiesPath = null);
  const p = join(tmpdir(), "winclipz-cookies.txt");
  await writeFile(p, Buffer.from(b64, "base64"));
  return (cookiesPath = p);
}

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

async function ytdlpDownload(url: string, outPath: string): Promise<void> {
  const cookies = await cookiesFile();
  return new Promise((resolve, reject) => {
    // bv*+ba/b → best video+audio, fall back to best single file; merge to mp4.
    const args = [
      "-f", "bv*+ba/b",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-progress",
      "--retries", "3",
      "--sleep-requests", "1", // gentler pacing — avoids 429s on repeat runs
      ...(cookies ? ["--cookies", cookies] : []),
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
