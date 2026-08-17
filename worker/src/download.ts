/**
 * Fetch a stream's source to a local file. Two cases:
 *  - Direct media (our R2 uploads, or a URL ending in a video extension):
 *    plain HTTP download.
 *  - A platform link (YouTube, Twitch, Kick, TikTok, …): resolve + download
 *    with yt-dlp (bundled in the worker image), merging to mp4.
 */
import { writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assertPublicUrl } from "./ssrf.ts";

const MEDIA_EXT = /\.(mp4|mov|webm|mkv|m4v)(\?|$)/i;
const YTDLP = process.env.YTDLP_PATH ?? "yt-dlp";
// Cap a single source download. Big enough for multi-hour VODs, small enough to
// stop an attacker pointing us at an endless/huge stream.
const MAX_BYTES = Number(process.env.MAX_SOURCE_BYTES ?? 8 * 1024 * 1024 * 1024); // 8 GB
const FETCH_TIMEOUT_MS = Number(process.env.SOURCE_FETCH_TIMEOUT_MS ?? 20 * 60_000); // 20 min

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
  await assertPublicUrl(url); // SSRF guard
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`fetch source ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared && declared > MAX_BYTES) throw new Error(`source too large (${declared} bytes)`);
    if (!res.body) throw new Error("no response body");

    // Stream to disk (never buffer a multi-GB VOD in memory), enforcing the cap.
    let seen = 0;
    const counter = new TransformStream({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > MAX_BYTES) {
          controller.error(new Error(`source exceeded ${MAX_BYTES} bytes`));
          ctrl.abort();
          return;
        }
        controller.enqueue(chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(res.body.pipeThrough(counter) as unknown as ReadableStream),
      createWriteStream(outPath)
    );
  } finally {
    clearTimeout(timer);
  }
}

async function ytdlpDownload(url: string, outPath: string): Promise<void> {
  await assertPublicUrl(url); // SSRF guard — block internal hosts even for yt-dlp
  const cookies = await cookiesFile();
  // Residential proxy (http://user:pass@host:port) — the standard fix for
  // YouTube's datacenter-IP bot checks. Set YTDLP_PROXY to enable.
  const proxy = process.env.YTDLP_PROXY;
  return new Promise((resolve, reject) => {
    // bv*+ba/b → best video+audio, fall back to best single file; merge to mp4.
    const args = [
      "-f", "bv*+ba/b",
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-progress",
      "--retries", "3",
      "--max-filesize", String(MAX_BYTES),
      "--sleep-requests", "1", // gentler pacing — avoids 429s on repeat runs
      // Residential proxies often terminate TLS with legacy handshakes; yt-dlp
      // errors SSLV3_ALERT_HANDSHAKE_FAILURE without this flag.
      ...(proxy ? ["--proxy", proxy, "--legacy-server-connect"] : []),
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
