import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { getSessionTenantId } from "@/server/auth";
import { createApiKey } from "@/server/apikeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the workspace's API keys (never the secrets — only metadata). */
export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ keys: [] });
  const tenantId = await getSessionTenantId();
  if (!tenantId) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const keys = await prisma.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json({ keys });
}

/** Create a key — the secret is returned ONCE. */
export async function POST(req: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "demo mode" }, { status: 400 });
  const tenantId = await getSessionTenantId();
  if (!tenantId) return NextResponse.json({ error: "sign in" }, { status: 401 });
  let name = "API key";
  try {
    const body = (await req.json()) as { name?: unknown };
    if (typeof body.name === "string" && body.name.trim()) name = body.name.trim();
  } catch {
    /* empty body is fine */
  }
  const { id, key } = await createApiKey(tenantId, name);
  return NextResponse.json({ id, key, note: "Store this key now — it won't be shown again." });
}

/** Revoke a key: DELETE /api/keys?id=… */
export async function DELETE(req: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "demo mode" }, { status: 400 });
  const tenantId = await getSessionTenantId();
  if (!tenantId) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const res = await prisma.apiKey.deleteMany({ where: { id, tenantId } });
  if (res.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
