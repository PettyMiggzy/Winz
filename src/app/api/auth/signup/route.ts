import { NextResponse } from "next/server";
import { signUp } from "@/server/auth";
import { rateLimit, clientIp, sameOrigin } from "@/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  if ((body as { agreeTos?: unknown }).agreeTos !== true) {
    return NextResponse.json({ error: "you must agree to the Terms of Service" }, { status: 400 });
  }
  // Throttle signups per IP — caps the email-enumeration oracle + spam accounts.
  const gate = await rateLimit(`signup:ip:${clientIp(req)}`, 10, 3600);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "too many attempts — try again later" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } }
    );
  }
  const res = await signUp(body.email, body.password, typeof body.name === "string" ? body.name : undefined);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
