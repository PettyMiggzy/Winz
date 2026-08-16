import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getProvider, isConfigured, buildAuthorizeUrl } from "@/lib/social-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Begin OAuth for a posting platform (tiktok | instagram). */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const p = getProvider(provider);
  const origin = new URL(req.url).origin;

  if (!p) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  if (!isConfigured(p)) {
    // Not wired yet — send the user back to setup instead of showing raw JSON.
    return NextResponse.redirect(new URL(`/dashboard/onboarding?connect=${p.id}`, origin));
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const jar = await cookies();
  jar.set(`oauth_state_${p.id}`, state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
  });
  return NextResponse.redirect(buildAuthorizeUrl(p, state));
}
