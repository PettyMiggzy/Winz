/**
 * Blotato posting adapter — the "post to every platform through one approved
 * app" bridge (the standard playbook: Blotato/Ayrshare/upload-post all work
 * this way). Blotato's own app is already audited by TikTok/YouTube/Meta, so we
 * post through it now and swap in official adapters later without touching the
 * poller — the PublishProvider interface stays identical.
 *
 * API (backend.blotato.com):
 *   POST /v2/media  { url }                → { url }   (host our R2 clip)
 *   POST /v2/posts  { post: {...} }        → { postSubmissionId }
 * Auth header: `blotato-api-key: <key>`.
 */

const BASE = process.env.BLOTATO_BASE_URL ?? "https://backend.blotato.com";

export type Platform = "tiktok" | "youtube" | "instagram";

export interface PublishInput {
  /** Blotato account id for the destination (stored on SocialAccount.externalId). */
  accountId: string;
  platform: Platform;
  /** Public URL of the rendered clip (R2). */
  mediaUrl: string;
  title: string;
  caption: string;
  /** Per-post options chosen at approval (TikTok privacy + toggles). */
  meta?: Record<string, unknown>;
}

export interface PublishResult {
  externalId?: string;
  url?: string;
}

export const blotatoConfigured = (): boolean => Boolean(process.env.BLOTATO_API_KEY);

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "blotato-api-key": process.env.BLOTATO_API_KEY ?? "",
  };
}

/** Re-host the clip on Blotato's storage (some platforms reject arbitrary URLs). */
async function hostMedia(mediaUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/v2/media`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url: mediaUrl }),
  });
  if (!res.ok) throw new Error(`blotato /v2/media ${res.status}: ${await safeText(res)}`);
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("blotato /v2/media returned no url");
  return json.url;
}

/** Build the platform-specific `target` block. */
function targetFor(
  platform: Platform,
  title: string,
  meta?: Record<string, unknown>
): Record<string, unknown> {
  switch (platform) {
    case "tiktok": {
      const m = (meta ?? {}) as {
        privacyLevel?: string;
        disableComment?: boolean;
        disableDuet?: boolean;
        disableStitch?: boolean;
        brandContent?: boolean;
        brandOrganic?: boolean;
        isAiGenerated?: boolean;
      };
      return {
        targetType: "tiktok",
        // Honor the user's choice; fail closed to private if missing.
        privacyLevel: m.privacyLevel ?? "SELF_ONLY",
        disabledComments: m.disableComment ?? false,
        disabledDuet: m.disableDuet ?? false,
        disabledStitch: m.disableStitch ?? false,
        isBrandedContent: m.brandContent ?? false,
        isYourBrand: m.brandOrganic ?? false,
        isAiGenerated: m.isAiGenerated ?? false,
      };
    }
    case "instagram":
      return { targetType: "instagram", mediaType: "reel" };
    case "youtube":
      return {
        targetType: "youtube",
        title: title.slice(0, 100), // YouTube title cap
        privacyStatus: "public",
        shouldNotifySubscribers: true,
      };
  }
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (!blotatoConfigured()) throw new Error("BLOTATO_API_KEY not set");
  const hosted = await hostMedia(input.mediaUrl);
  const body = {
    post: {
      accountId: input.accountId,
      content: {
        text: input.caption,
        mediaUrls: [hosted],
        platform: input.platform,
      },
      target: targetFor(input.platform, input.title, input.meta),
    },
  };
  const res = await fetch(`${BASE}/v2/posts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`blotato /v2/posts ${res.status}: ${await safeText(res)}`);
  const json = (await res.json()) as { postSubmissionId?: string | number; url?: string };
  return {
    externalId: json.postSubmissionId != null ? String(json.postSubmissionId) : undefined,
    url: json.url,
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
