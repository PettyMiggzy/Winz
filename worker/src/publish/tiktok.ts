/**
 * In-house TikTok adapter (our own developer app — no vendor).
 *
 * Two modes, per TikTok's Content Posting API:
 *  - direct  (video.publish): posts straight to the profile. Sandbox/audited
 *    apps only — unaudited production clients are forced private by TikTok.
 *  - draft   (video.upload):  sends to the creator's TikTok inbox/drafts; the
 *    creator taps post in the app. Works without the audit.
 *
 * Upload is push_by_file (init → PUT bytes → TikTok processes), so no domain
 * verification is needed. Tokens auto-refresh via the stored refresh_token.
 *
 * Uploading the bytes is NOT publishing. TikTok processes asynchronously and
 * can still reject the post (format, duration, spam risk, revoked auth), so
 * the publish_id is a receipt, not a result — the caller polls
 * `fetchPublishStatus` until TikTok commits one way or the other.
 */
import { sql } from "../db.ts";

const API = "https://open.tiktokapis.com/v2";
const MODE = (process.env.TIKTOK_POST_MODE ?? "direct") as "direct" | "draft";

export interface TikTokMeta {
  privacyLevel?: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandContent?: boolean;
  brandOrganic?: boolean;
  isAiGenerated?: boolean;
}

interface Account {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export const tiktokConfigured = (): boolean =>
  Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);

/** Get a fresh access token for the account, refreshing (and persisting) if stale. */
async function accessTokenFor(accountId: string): Promise<string> {
  const rows = await sql<Account[]>`
    SELECT id, "accessToken", "refreshToken", "tokenExpiresAt"
    FROM "SocialAccount" WHERE id = ${accountId}`;
  if (rows.length === 0 || !rows[0].accessToken) throw new Error("account has no TikTok token");
  const a = rows[0];

  const fresh = a.tokenExpiresAt && new Date(a.tokenExpiresAt).getTime() > Date.now() + 5 * 60_000;
  if (fresh) return a.accessToken!;
  if (!a.refreshToken) return a.accessToken!; // hope it still works; API will say otherwise

  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: a.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`tiktok token refresh ${res.status}`);
  const tok = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tok.access_token) throw new Error("tiktok refresh returned no access_token");
  // CAS on the old refresh token so a concurrent refresh (multiple workers, or a
  // re-connect) can't clobber a newer rotated token with a now-dead one.
  const upd = await sql`
    UPDATE "SocialAccount"
    SET "accessToken" = ${tok.access_token},
        "refreshToken" = ${tok.refresh_token ?? a.refreshToken},
        "tokenExpiresAt" = ${tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : null}
    WHERE id = ${a.id} AND "refreshToken" = ${a.refreshToken}`;
  if (upd.count === 0) {
    // Someone else refreshed first — re-read and use their fresh token.
    const [again] = await sql<Account[]>`SELECT "accessToken" FROM "SocialAccount" WHERE id = ${a.id}`;
    if (again?.accessToken) return again.accessToken;
  }
  return tok.access_token;
}

async function fetchVideo(mediaUrl: string): Promise<Buffer> {
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`fetch clip ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** init → upload bytes → return publish id for status tracking. */
export async function publishToTikTok(input: {
  /** WinClipz SocialAccount id (not the TikTok open_id). */
  socialAccountId: string;
  mediaUrl: string;
  caption: string;
  meta: TikTokMeta;
}): Promise<{ externalId?: string; pending: boolean }> {
  const token = await accessTokenFor(input.socialAccountId);
  const video = await fetchVideo(input.mediaUrl);

  // TikTok FILE_UPLOAD chunk rules: single chunk is only valid for files <= 64MB;
  // larger files must be split into 5MB–64MB chunks. Clips are short (usually
  // well under 64MB), but handle big ones correctly instead of sending an
  // invalid single chunk. Max total 4GB.
  const MB = 1024 * 1024;
  if (video.length > 4096 * MB) throw new Error("clip exceeds TikTok 4GB limit");
  const SINGLE_MAX = 64 * MB;
  let chunkSize: number;
  let totalChunks: number;
  if (video.length <= SINGLE_MAX) {
    chunkSize = video.length;
    totalChunks = 1;
  } else {
    chunkSize = 32 * MB; // within the 5–64MB window
    totalChunks = Math.ceil(video.length / chunkSize);
  }
  const sourceInfo = {
    source: "FILE_UPLOAD",
    video_size: video.length,
    chunk_size: chunkSize,
    total_chunk_count: totalChunks,
  };

  const isDirect = MODE === "direct";
  const initUrl = isDirect
    ? `${API}/post/publish/video/init/`
    : `${API}/post/publish/inbox/video/init/`;
  const initBody = isDirect
    ? {
        post_info: {
          title: input.caption.slice(0, 2200),
          privacy_level: input.meta.privacyLevel ?? "SELF_ONLY",
          disable_comment: input.meta.disableComment ?? false,
          disable_duet: input.meta.disableDuet ?? false,
          disable_stitch: input.meta.disableStitch ?? false,
          brand_content_toggle: input.meta.brandContent ?? false,
          brand_organic_toggle: input.meta.brandOrganic ?? false,
          is_aigc: input.meta.isAiGenerated ?? false,
        },
        source_info: sourceInfo,
      }
    : { source_info: sourceInfo };

  const init = await fetch(initUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(initBody),
  });
  if (!init.ok) throw new Error(`tiktok init ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const initJson = (await init.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (initJson.error?.code && initJson.error.code !== "ok") {
    throw new Error(`tiktok init: ${initJson.error.code} ${initJson.error.message ?? ""}`);
  }
  const uploadUrl = initJson.data?.upload_url;
  if (!uploadUrl) throw new Error("tiktok init returned no upload_url");

  // Upload each chunk with the correct Content-Range (single chunk = whole file).
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, video.length);
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end - 1}/${video.length}`,
      },
      body: video.subarray(start, end),
    });
    if (!put.ok) throw new Error(`tiktok upload chunk ${i + 1}/${totalChunks} ${put.status}`);
  }

  const publishId = initJson.data?.publish_id;
  if (!publishId) throw new Error("tiktok init returned no publish_id");
  // Bytes are in; TikTok hasn't committed yet. The caller confirms.
  return { externalId: publishId, pending: true };
}

// ------------------------------------------------------ publish status

/** TikTok's terminal states for an upload, plus "still working on it". */
export type PublishOutcome =
  | { state: "pending" }
  | { state: "posted"; postId: string | null; inbox: boolean }
  | { state: "failed"; reason: string };

interface StatusResponse {
  data?: {
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: (number | string)[];
    // TikTok's own docs carry the typo; tolerate the corrected spelling too in
    // case they ever fix it.
    publicly_available_post_id?: (number | string)[];
  };
  error?: { code?: string; message?: string };
}

/**
 * Map a status response to a decision. Pure so the state machine is testable
 * without a TikTok app — the network call is the easy part, deciding whether a
 * creator's post really went live is the part worth being sure about.
 */
export function interpretStatus(json: StatusResponse): PublishOutcome {
  const code = json.error?.code;
  if (code && code !== "ok") {
    return { state: "failed", reason: `${code}${json.error?.message ? `: ${json.error.message}` : ""}` };
  }
  const d = json.data ?? {};
  const ids = d.publicaly_available_post_id ?? d.publicly_available_post_id ?? [];
  const postId = ids.length > 0 ? String(ids[0]) : null;
  switch (d.status) {
    case "PUBLISH_COMPLETE":
      return { state: "posted", postId, inbox: false };
    case "SEND_TO_USER_INBOX":
      // Draft mode's success: it's in the creator's TikTok inbox to publish.
      return { state: "posted", postId, inbox: true };
    case "FAILED":
      return { state: "failed", reason: d.fail_reason || "tiktok rejected the upload" };
    case "PROCESSING_UPLOAD":
    case "PROCESSING_DOWNLOAD":
      return { state: "pending" };
    default:
      // An unknown status is not a success. Stay pending; the caller's deadline
      // turns a permanently-unknown post into a failure rather than a lie.
      return { state: "pending" };
  }
}

/** Ask TikTok what actually happened to an upload. */
export async function fetchPublishStatus(
  socialAccountId: string,
  publishId: string
): Promise<PublishOutcome> {
  const token = await accessTokenFor(socialAccountId);
  const res = await fetch(`${API}/post/publish/status/fetch/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ publish_id: publishId }),
  });
  if (!res.ok) throw new Error(`tiktok status ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return interpretStatus((await res.json()) as StatusResponse);
}

/** Public URL for a confirmed post. TikTok returns only the numeric id. */
export function postUrl(handle: string, postId: string): string {
  return `https://www.tiktok.com/@${handle.replace(/^@/, "")}/video/${postId}`;
}
