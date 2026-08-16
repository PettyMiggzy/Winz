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
  await sql`
    UPDATE "SocialAccount"
    SET "accessToken" = ${tok.access_token},
        "refreshToken" = ${tok.refresh_token ?? a.refreshToken},
        "tokenExpiresAt" = ${tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : null}
    WHERE id = ${a.id}`;
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
}): Promise<{ externalId?: string }> {
  const token = await accessTokenFor(input.socialAccountId);
  const video = await fetchVideo(input.mediaUrl);

  const chunkSize = video.length; // single-chunk upload (clips are small)
  const sourceInfo = {
    source: "FILE_UPLOAD",
    video_size: video.length,
    chunk_size: chunkSize,
    total_chunk_count: 1,
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

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${video.length - 1}/${video.length}`,
    },
    body: video,
  });
  if (!put.ok) throw new Error(`tiktok upload ${put.status}`);

  return { externalId: initJson.data?.publish_id };
}
