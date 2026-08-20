import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, getCurrentUser, subscribeToLivestreamEvents } from "@/lib/kick";
import { getSessionTenantId } from "@/server/auth";
import { getPrisma, hasDatabase } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick OAuth callback. Validates CSRF state + PKCE, exchanges the code, stores
 * the channel against the signed-in workspace, and subscribes to livestream
 * events so we know the moment a stream ends (→ auto-clip the VOD).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/accounts?${q}`, url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return back(`error=${encodeURIComponent(error)}&provider=kick`);
  if (!code || !state) return NextResponse.json({ error: "missing code or state" }, { status: 400 });

  // The channel belongs to a specific workspace — must be signed in.
  const tenantId = hasDatabase ? await getSessionTenantId() : null;
  if (hasDatabase && !tenantId) return back("error=signed_out&provider=kick");

  const jar = await cookies();
  const savedState = jar.get("kick_oauth_state")?.value;
  const verifier = jar.get("kick_oauth_verifier")?.value;
  if (!savedState || savedState !== state || !verifier) {
    return NextResponse.json({ error: "invalid oauth state" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    const me = await getCurrentUser(token.access_token);
    if (!me) throw new Error("couldn't read the Kick account");

    const prisma = getPrisma();
    if (prisma && tenantId) {
      const data = {
        handle: me.name,
        externalId: String(me.user_id),
        connected: true,
        connectedAt: new Date(),
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      };
      const existing = await prisma.socialAccount.findFirst({
        where: { tenantId, platform: "KICK" },
      });
      if (existing) {
        await prisma.socialAccount.update({ where: { id: existing.id }, data });
      } else {
        await prisma.socialAccount.create({
          data: { tenantId, platform: "KICK", role: "MAIN", warmupState: "READY", ...data },
        });
      }
      // Remember the channel on the workspace for display + VOD lookups.
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { kickSlug: me.name.toLowerCase() },
      }).catch(() => {}); // kickSlug is unique — ignore a clash with another workspace
    }

    // Best-effort: subscribing is what makes auto-clipping work, but a failure
    // here shouldn't undo a successful connect — the user can retry from Accounts.
    const subscribed = await subscribeToLivestreamEvents(token.access_token).catch(() => false);
    return back(subscribed ? "connected=kick" : "connected=kick&warn=no_events");
  } catch {
    return back("error=token_exchange&provider=kick");
  } finally {
    jar.delete("kick_oauth_state");
    jar.delete("kick_oauth_verifier");
  }
}
