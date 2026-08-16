import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken } from "@/lib/kick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick OAuth callback. Validates CSRF state, exchanges the code for tokens using
 * the stored PKCE verifier, then hands off to the dashboard. Token persistence
 * (encrypted, per-tenant) is wired with the accounts model.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code || !state) {
    return NextResponse.json({ error: "missing code or state" }, { status: 400 });
  }

  const jar = await cookies();
  const savedState = jar.get("kick_oauth_state")?.value;
  const verifier = jar.get("kick_oauth_verifier")?.value;
  if (!savedState || savedState !== state || !verifier) {
    return NextResponse.json({ error: "invalid oauth state" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    // TODO: persist token against the authenticated tenant's Kick account.
    void token;
  } catch (e) {
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=token_exchange`, url.origin));
  } finally {
    jar.delete("kick_oauth_state");
    jar.delete("kick_oauth_verifier");
  }

  return NextResponse.redirect(new URL("/dashboard/accounts?connected=kick", url.origin));
}
