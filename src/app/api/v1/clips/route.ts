import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { tenantForApiKey } from "@/server/apikeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** v1 — list the workspace's clips (newest first, up to 100). */
export async function GET(req: Request) {
  const tenantId = await tenantForApiKey(req.headers.get("authorization"));
  if (!tenantId) return NextResponse.json({ error: "invalid or missing API key" }, { status: 401 });
  const prisma = getPrisma()!;

  const clips = await prisma.clip.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, hook: true, durationSec: true, score: true, status: true, storageKey: true, createdAt: true },
  });
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return NextResponse.json({
    clips: clips.map((c) => ({
      id: c.id,
      title: c.title,
      caption: c.hook,
      durationSec: c.durationSec,
      score: c.score,
      status: c.status,
      createdAt: c.createdAt,
      videoUrl: base && c.storageKey && !c.storageKey.startsWith("/") ? `${base}/${c.storageKey}` : null,
    })),
  });
}
