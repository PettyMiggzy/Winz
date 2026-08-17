import { NextResponse } from "next/server";
import { signIn } from "@/server/auth";
import { rateLimit, clientIp, sameOrigin } from "@/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  // Brute-force protection: cap attempts per IP and per targeted account.
  const email = body.email.trim().toLowerCase();
  const ip = clientIp(req);
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 20, 600), // 20 / 10 min per IP
    rateLimit(`login:email:${email}`, 8, 600), // 8 / 10 min per account
  ]);
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfterSec, byEmail.retryAfterSec);
    return NextResponse.json(
      { error: "too many attempts — try again later" },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  const res = await signIn(email, body.password);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 401 });
  return NextResponse.json({ ok: true });
}
