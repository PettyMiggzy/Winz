import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { getSessionTenantId } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark an upload complete → QUEUED so the worker picks it up. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: true }); // seed mode
  const tenantId = await getSessionTenantId();
  if (!tenantId) return NextResponse.json({ error: "sign in" }, { status: 401 });

  const res = await prisma.stream.updateMany({
    where: { id, tenantId, status: "UPLOADING" },
    data: { status: "QUEUED" },
  });
  if (res.count === 0) return NextResponse.json({ error: "stream not found" }, { status: 404 });
  return NextResponse.json({ ok: true, queued: true });
}
