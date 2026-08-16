import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProvider, isConfigured } from "@/lib/social-oauth";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string; // TikTok
  user_id?: string; // Instagram
  scope?: string;
}

/** Fetch display info so the user can see exactly which account connected. */
async function fetchProfile(
  provider: string,
  accessToken: string
): Promise<{ externalId?: string; handle?: string }> {
  if (provider === "tiktok") {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return {};
    const json = (await res.json()) as {
      data?: { user?: { open_id?: string; display_name?: string } };
    };
    return {
      externalId: json.data?.user?.open_id,
      handle: json.data?.user?.display_name,
    };
  }
  if (provider === "instagram") {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return {};
    const json = (await res.json()) as { user_id?: string; username?: string };
    return { externalId: json.user_id, handle: json.username };
  }
  return {};
}

/** OAuth callback for tiktok | instagram: validate state, exchange the code,
 *  persist the account (tokens + identity) and mark it connected/warming. */
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
    const body = new URLSearchParams({
      [p.clientParam]: p.clientId!,
      client_secret: p.clientSecret!,
      code,
      grant_type: "authorization_code",
      redirect_uri: p.redirectUri!,
    });
    const res = await fetch(p.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`token ${res.status}`);
    const tok = (await res.json()) as TokenResponse;
    if (!tok.access_token) throw new Error("no access_token in response");

    const profile = await fetchProfile(p.id, tok.access_token);
    const externalId = profile.externalId ?? tok.open_id ?? tok.user_id ?? null;
    const handle = profile.handle ?? `${p.label} account`;

    const prisma = getPrisma();
    if (prisma) {
      const platform = p.id.toUpperCase() as "TIKTOK" | "INSTAGRAM";
      const tenant = await prisma.tenant.upsert({
        where: { kickSlug: "winslowbankz" },
        update: {},
        create: { name: "WinslowBankz", kickSlug: "winslowbankz" },
      });
      const existing = externalId
        ? await prisma.socialAccount.findFirst({
            where: { tenantId: tenant.id, platform, externalId },
          })
        : null;
      const tokenData = {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token ?? null,
        tokenExpiresAt: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : null,
        connected: true,
        handle,
      };
      if (existing) {
        await prisma.socialAccount.update({ where: { id: existing.id }, data: tokenData });
      } else {
        await prisma.socialAccount.create({
          data: {
            tenantId: tenant.id,
            platform,
            role: "MAIN",
            externalId,
            warmupState: "WARMING",
            connectedAt: new Date(),
            ...tokenData,
          },
        });
      }
    }
  } catch {
    return back(`error=token_exchange&provider=${p.id}`);
  }
  return back(`connected=${p.id}`);
}
