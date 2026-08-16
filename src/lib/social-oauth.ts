/**
 * OAuth config for the posting platforms. Real endpoints + scopes; the flow is
 * gated on app credentials (set them when your TikTok/Meta apps are registered).
 * Instagram uses the Instagram-Login path (no Facebook Page needed).
 */

export type ProviderId = "tiktok" | "instagram";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientParam: "client_key" | "client_id"; // TikTok uses client_key
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope: string;
}

export function getProvider(id: string): ProviderConfig | null {
  if (id === "tiktok") {
    return {
      id: "tiktok",
      label: "TikTok",
      authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      clientParam: "client_key",
      clientId: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      redirectUri: process.env.TIKTOK_REDIRECT_URI,
      // Must match EXACTLY what the app/sandbox has enabled — TikTok errors
      // with "scope" otherwise. Override without a deploy via TIKTOK_SCOPES.
      scope: process.env.TIKTOK_SCOPES ?? "user.info.basic,video.upload,video.publish",
    };
  }
  if (id === "instagram") {
    return {
      id: "instagram",
      label: "Instagram",
      authorizeUrl: "https://www.instagram.com/oauth/authorize",
      tokenUrl: "https://api.instagram.com/oauth/access_token",
      clientParam: "client_id",
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
      scope: "instagram_business_basic,instagram_business_content_publish",
    };
  }
  return null;
}

export function isConfigured(p: ProviderConfig): boolean {
  return Boolean(p.clientId && p.clientSecret && p.redirectUri);
}

export function buildAuthorizeUrl(p: ProviderConfig, state: string): string {
  const u = new URL(p.authorizeUrl);
  u.searchParams.set(p.clientParam, p.clientId!);
  u.searchParams.set("redirect_uri", p.redirectUri!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", p.scope);
  u.searchParams.set("state", state);
  return u.toString();
}
