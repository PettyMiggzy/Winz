import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken } from "@/lib/kick";
import { getSessionTenantId } from "@/server/auth";
import { hasDatabase } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick OAuth callback. Validates CSRF state + a signed-in session, exchanges the
 * code for tokens using the stored PKCE verifier. NOTE: token persistence isn't
 * wired yet — until it is, this reports an error rather than a false "connected".
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/accounts?${q}`, url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return back(`error=${encodeURIComponent(error)}&provider=kick`);
  if (!code || !state) return NextResponse.json({ error: "missing code or state" }, { status: 400 });

  // Must be signed in — the token belongs to a specific workspace.
  if (hasDatabase && !(await getSessionTenantId())) return back("error=signed_out&provider=kick");

  const jar = await cookies();
  const savedState = jar.get("kick_oauth_state")?.value;
  const verifier = jar.get("kick_oauth_verifier")?.value;
  if (!savedState || savedState !== state || !verifier) {
    return NextResponse.json({ error: "invalid oauth state" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    // TODO: persist token against the session tenant's Kick account. Until then,
    // don't claim success — the connection isn't actually stored.
    void token;
    return back("error=kick_not_implemented&provider=kick");
  } catch {
    return back("error=token_exchange&provider=kick");
  } finally {
    jar.delete("kick_oauth_state");
    jar.delete("kick_oauth_verifier");
  }
}
