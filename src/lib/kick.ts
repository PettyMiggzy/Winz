import crypto from "node:crypto";

/**
 * Kick API integration: OAuth 2.1 (authorization_code + PKCE), app tokens
 * (client_credentials), and webhook signature verification. Grounded in the
 * research in docs/research/01-kick-api.md.
 */

export const KICK_ID_BASE = "https://id.kick.com";
export const KICK_API_BASE = "https://api.kick.com/public/v1";

const CLIENT_ID = process.env.KICK_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.KICK_REDIRECT_URI ?? "";

export const KICK_SCOPES = ["user:read", "channel:read", "events:subscribe"] as const;

// ---------------------------------------------------------------- PKCE

export function createPkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(opts: { state: string; challenge: string }) {
  const u = new URL("/oauth/authorize", KICK_ID_BASE);
  u.searchParams.set("client_id", CLIENT_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", REDIRECT_URI);
  u.searchParams.set("scope", KICK_SCOPES.join(" "));
  u.searchParams.set("state", opts.state);
  u.searchParams.set("code_challenge", opts.challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenResponse> {
  const res = await fetch(`${KICK_ID_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Kick token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Server-to-server app token (client_credentials) for public data + webhooks. */
export async function getAppToken(): Promise<TokenResponse> {
  const res = await fetch(`${KICK_ID_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Kick app token failed: ${res.status}`);
  return res.json();
}

// ------------------------------------------------------ webhook verify

let cachedKey: { pem: string; at: number } | null = null;

/** Kick's public key rotates rarely; cache it for an hour. */
export async function getKickPublicKey(): Promise<string> {
  if (cachedKey && Date.now() - cachedKey.at < 3600_000) return cachedKey.pem;
  const res = await fetch(`${KICK_API_BASE}/public-key`);
  if (!res.ok) throw new Error(`Kick public-key fetch failed: ${res.status}`);
  const json = await res.json();
  const pem: string = json?.data?.public_key ?? json?.public_key;
  if (!pem) throw new Error("Kick public-key response missing key");
  cachedKey = { pem, at: Date.now() };
  return pem;
}

export interface KickSignatureHeaders {
  messageId: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function readSignatureHeaders(h: Headers): KickSignatureHeaders {
  return {
    messageId: h.get("Kick-Event-Message-Id"),
    timestamp: h.get("Kick-Event-Message-Timestamp"),
    signature: h.get("Kick-Event-Signature"),
  };
}

/**
 * Pure RSA-SHA256 check over `${messageId}.${timestamp}.${rawBody}` against a
 * given public key. Extracted from the fetch/staleness logic so it is unit
 * testable without network access.
 */
export function verifyEventSignature(
  rawBody: string,
  headers: KickSignatureHeaders,
  pem: string
): boolean {
  const { messageId, timestamp, signature } = headers;
  if (!messageId || !timestamp || !signature) return false;
  const payload = `${messageId}.${timestamp}.${rawBody}`;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(payload);
  verifier.end();
  try {
    return verifier.verify(pem, signature, "base64");
  } catch {
    return false;
  }
}

/**
 * Verify a Kick webhook: freshness (replay guard) + RSA-SHA256 signature over
 * `${messageId}.${timestamp}.${rawBody}` using Kick's published public key.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: KickSignatureHeaders
): Promise<boolean> {
  const { messageId, timestamp, signature } = headers;
  if (!messageId || !timestamp || !signature) return false;

  // Reject stale timestamps (>5 min) to blunt replay attacks.
  const ts = Date.parse(timestamp);
  if (Number.isFinite(ts) && Math.abs(Date.now() - ts) > 5 * 60_000) return false;

  const pem = await getKickPublicKey();
  return verifyEventSignature(rawBody, headers, pem);
}

// ------------------------------------------------- channel + auto-clip helpers

export interface KickUser {
  user_id: number;
  name: string;
  profile_picture?: string;
}

/** The authenticated user (GET /public/v1/users with no ids returns "me"). */
export async function getCurrentUser(accessToken: string): Promise<KickUser | null> {
  const res = await fetch(`${KICK_API_BASE}/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: KickUser[] };
  return json.data?.[0] ?? null;
}

/**
 * Subscribe this app to a broadcaster's livestream status events, so we're told
 * the moment a stream ends. Returns true when the subscription is live.
 */
export async function subscribeToLivestreamEvents(accessToken: string): Promise<boolean> {
  const res = await fetch(`${KICK_API_BASE}/events/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    // With a user token the broadcaster is inferred from the token itself.
    body: JSON.stringify({
      events: [{ name: "livestream.status.updated", version: 1 }],
      method: "webhook",
    }),
  });
  return res.ok;
}

/**
 * Newest VOD for a channel, as a yt-dlp-downloadable URL.
 *
 * Kick's *public* v1 API doesn't expose VODs, so this uses the same v2 endpoint
 * the yt-dlp extractor targets. It's undocumented and can change — callers must
 * treat null as "couldn't find it" and fall back to a manual link, never crash.
 */
export async function getLatestVodUrl(channelSlug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channelSlug)}/videos`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; WinClipz/1.0)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      video?: { uuid?: string };
      uuid?: string;
      created_at?: string;
      start_time?: string;
    }>;
    if (!Array.isArray(json) || json.length === 0) return null;
    // Newest first isn't guaranteed — sort by start/created time when present.
    const sorted = [...json].sort((a, b) => {
      const ta = Date.parse(b.start_time ?? b.created_at ?? "") || 0;
      const tb = Date.parse(a.start_time ?? a.created_at ?? "") || 0;
      return ta - tb;
    });
    const uuid = sorted[0]?.video?.uuid ?? sorted[0]?.uuid;
    if (!uuid) return null;
    return `https://kick.com/${channelSlug}/videos/${uuid}`;
  } catch {
    return null;
  }
}

/**
 * Live event subscriptions for this app. Used to show whether auto-clipping is
 * actually armed — "channel connected" and "subscribed to stream events" are
 * different things, and only the second one makes clips appear by themselves.
 */
export async function listEventSubscriptions(
  accessToken: string
): Promise<{ id: string; event: string }[] | null> {
  try {
    const res = await fetch(`${KICK_API_BASE}/events/subscriptions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { id?: string; event?: string }[] };
    return (json.data ?? []).map((s) => ({ id: s.id ?? "", event: s.event ?? "" }));
  } catch {
    return null; // network/API hiccup — caller shows "unknown", never crashes
  }
}
