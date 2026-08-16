import { NextResponse } from "next/server";
import { signIn } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  const res = await signIn(body.email, body.password);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 401 });
  return NextResponse.json({ ok: true });
}
