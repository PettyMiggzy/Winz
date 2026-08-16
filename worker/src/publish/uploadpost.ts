/**
 * upload-post.com posting adapter — the researched pick: $16/mo for 5 profiles
 * (5 accts/platform), $33/mo at 25 profiles. Holds the platform approvals
 * (incl. TikTok's content-posting audit) so posts can be PUBLIC without us
 * passing any audit ourselves.
 *
 * API (api.upload-post.com):
 *   POST /api/upload  multipart form; `video` accepts a public URL.
 *   Auth: `Authorization: Apikey <key>`.
 * Account targeting: `user` = the upload-post PROFILE name (one account per
 * platform per profile) — stored on SocialAccount.externalId.
 */

export type Platform = "tiktok" | "youtube" | "instagram";

export interface PublishInput {
  /** upload-post profile name for the destination account (SocialAccount.externalId). */
  accountId: string;
  platform: Platform;
  /** Public URL of the rendered clip (R2). */
  mediaUrl: string;
  title: string;
  caption: string;
}

export interface PublishResult {
  externalId?: string;
  url?: string;
}

const BASE = process.env.UPLOADPOST_BASE_URL ?? "https://api.upload-post.com";

export const uploadPostConfigured = (): boolean => Boolean(process.env.UPLOADPOST_API_KEY);

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (!uploadPostConfigured()) throw new Error("UPLOADPOST_API_KEY not set");

  const form = new FormData();
  form.append("user", input.accountId);
  form.append("platform[]", input.platform);
  form.append("video", input.mediaUrl); // public URL — no binary upload needed
  form.append("title", input.title);
  form.append("caption", input.caption);
  form.append("async_upload", "true"); // don't block the poller on long processing

  switch (input.platform) {
    case "tiktok":
      form.append("tiktok_title", input.caption.slice(0, 150));
      form.append("privacy_level", "PUBLIC_TO_EVERYONE");
      break;
    case "youtube":
      form.append("youtube_title", input.title.slice(0, 100));
      form.append("youtube_privacy", "public");
      break;
    case "instagram":
      form.append("media_type", "REELS");
      break;
  }

  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Apikey ${process.env.UPLOADPOST_API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`upload-post /api/upload ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    success?: boolean;
    request_id?: string;
    job_id?: string;
    results?: Record<string, { success?: boolean; url?: string; error?: string }>;
  };

  // Sync response carries per-platform results; async carries a request_id.
  const platformResult = json.results?.[input.platform];
  if (platformResult && platformResult.success === false) {
    throw new Error(`upload-post ${input.platform}: ${platformResult.error ?? "failed"}`);
  }
  if (json.success === false) {
    throw new Error("upload-post returned success:false");
  }
  return {
    externalId: json.request_id ?? json.job_id,
    url: platformResult?.url,
  };
}
