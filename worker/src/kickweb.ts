/**
 * kick.com's own (undocumented) JSON endpoints — the ones the website calls.
 *
 * Kick's *public* API is fine from anywhere but doesn't expose everything we
 * need: it has no chatroom id and no VOD list. Those only exist on kick.com,
 * which sits behind bot protection that 403s datacenter IPs. That's why this
 * lives in the worker and not the web app: the worker already has a
 * residential proxy configured for yt-dlp, and curl (also already in the image)
 * can use it — Node's global fetch can't without pulling in undici's
 * ProxyAgent.
 *
 * Every function here returns null on failure. These are best-effort reads of
 * an unversioned surface; callers must have a path that works without them.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Redact proxy credentials before anything reaches a log line. */
function safeProxy(proxy: string | undefined): string {
  if (!proxy) return "none";
  try {
    const u = new URL(proxy);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "set";
  }
}

async function kickJson<T>(path: string, timeoutSec = 20): Promise<T | null> {
  const proxy = process.env.YTDLP_PROXY;
  const url = `https://kick.com${path}`;
  const args = [
    "-sS",
    "-m",
    String(timeoutSec),
    "-H",
    "Accept: application/json",
    "-H",
    `User-Agent: ${UA}`,
    "-w",
    "\n%{http_code}",
    ...(proxy ? ["--proxy", proxy] : []),
    url,
  ];
  try {
    const { stdout } = await exec("curl", args, { maxBuffer: 8 * 1024 * 1024 });
    const nl = stdout.lastIndexOf("\n");
    const status = Number(stdout.slice(nl + 1).trim());
    const body = stdout.slice(0, nl);
    if (status !== 200) {
      console.warn(`[kickweb] ${path} → HTTP ${status} (proxy: ${safeProxy(proxy)})`);
      return null;
    }
    return JSON.parse(body) as T;
  } catch (e) {
    console.warn(`[kickweb] ${path} failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

interface ChannelV2 {
  id?: number;
  user_id?: number;
  slug?: string;
  chatroom?: { id?: number };
}

/** The Pusher chatroom id for a channel. Needed to subscribe to its chat. */
export async function resolveChatroomId(slug: string): Promise<number | null> {
  const json = await kickJson<ChannelV2>(`/api/v2/channels/${encodeURIComponent(slug)}`);
  const id = json?.chatroom?.id;
  return typeof id === "number" && id > 0 ? id : null;
}

interface VodEntry {
  video?: { uuid?: string };
  uuid?: string;
  created_at?: string;
  start_time?: string;
}

/**
 * Newest published VOD for a channel, as a kick.com watch URL yt-dlp can take.
 *
 * Kick publishes a VOD some minutes after the stream ends — a null here often
 * means "not yet", not "never", so callers should retry rather than give up.
 */
export async function resolveLatestVod(slug: string): Promise<string | null> {
  const json = await kickJson<VodEntry[]>(`/api/v2/channels/${encodeURIComponent(slug)}/videos`);
  if (!Array.isArray(json) || json.length === 0) return null;
  // Newest-first isn't guaranteed — sort by start/created time when present.
  const sorted = [...json].sort(
    (a, b) =>
      (Date.parse(b.start_time ?? b.created_at ?? "") || 0) -
      (Date.parse(a.start_time ?? a.created_at ?? "") || 0)
  );
  const uuid = sorted[0]?.video?.uuid ?? sorted[0]?.uuid;
  return uuid ? `https://kick.com/${slug}/videos/${uuid}` : null;
}
