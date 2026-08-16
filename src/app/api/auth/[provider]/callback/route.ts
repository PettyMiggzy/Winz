import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProvider, isConfigured } from "@/lib/social-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OAuth callback for tiktok | instagram: validate state, exchange the code. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const p = getProvider(provider);
  const url = new URL(req.url);
  const origin = url.origin;
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/accounts?${q}`, origin));

  if (!p || !isConfigured(p)) return back(`error=not_configured&provider=${provider}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) return back(`error=${encodeURIComponent(err)}&provider=${p.id}`);
  if (!code || !state) return back(`error=missing_code&provider=${p.id}`);

  const jar = await cookies();
  const saved = jar.get(`oauth_state_${p.id}`)?.value;
  if (!saved || saved !== state) return back(`error=bad_state&provider=${p.id}`);
  jar.delete(`oauth_state_${p.id}`);

  try {
    const body =
      p.id === "tiktok"
        ? new URLSearchParams({
            client_key: p.clientId!, client_secret: p.clientSecret!,
            code, grant_type: "authorization_code", redirect_uri: p.redirectUri!,
          })
        : new URLSearchParams({
            client_id: p.clientId!, client_secret: p.clientSecret!,
            code, grant_type: "authorization_code", redirect_uri: p.redirectUri!,
          });
    const res = await fetch(p.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`token ${res.status}`);
    // TODO: persist the token + external account id against the tenant's
    // SocialAccount (encrypted), then mark it connected/warming.
    await res.json();
  } catch {
    return back(`error=token_exchange&provider=${p.id}`);
  }
  return back(`connected=${p.id}`);
}
