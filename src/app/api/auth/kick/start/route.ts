import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { buildAuthorizeUrl, createPkce } from "@/lib/kick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Begin the Kick OAuth flow. Stores the PKCE verifier and CSRF state in
 * short-lived httpOnly cookies, then redirects to Kick's authorize screen.
 */
export async function GET(req: Request) {
  if (!process.env.KICK_CLIENT_ID || !process.env.KICK_REDIRECT_URI) {
    // Not wired yet — send the user somewhere useful instead of raw JSON.
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=not_configured&provider=kick", new URL(req.url).origin)
    );
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const { verifier, challenge } = createPkce();

  const jar = await cookies();
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("kick_oauth_state", state, opts);
  jar.set("kick_oauth_verifier", verifier, opts);

  return NextResponse.redirect(buildAuthorizeUrl({ state, challenge }));
}
