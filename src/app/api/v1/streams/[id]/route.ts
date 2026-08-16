import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { tenantForApiKey } from "@/server/apikeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** v1 — check a submitted video's status (+ its clips when done). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await tenantForApiKey(req.headers.get("authorization"));
  if (!tenantId) return NextResponse.json({ error: "invalid or missing API key" }, { status: 401 });
  const { id } = await params;
  const prisma = getPrisma()!;

  const stream = await prisma.stream.findFirst({
    where: { id, tenantId },
    include: { clips: { select: { id: true, title: true, hook: true, durationSec: true, score: true, status: true, storageKey: true } } },
  });
  if (!stream) return NextResponse.json({ error: "not found" }, { status: 404 });

  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return NextResponse.json({
    id: stream.id,
    title: stream.title,
    status: stream.status,
    clips: stream.clips.map((c) => ({
      id: c.id,
      title: c.title,
      caption: c.hook,
      durationSec: c.durationSec,
      score: c.score,
      status: c.status,
      videoUrl: base && c.storageKey && !c.storageKey.startsWith("/") ? `${base}/${c.storageKey}` : null,
    })),
  });
}
