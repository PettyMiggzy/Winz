import { NextResponse } from "next/server";
import { recordClipDecision, type ClipDecision } from "@/server/store";
import type { Platform } from "@/lib/mock";

export const dynamic = "force-dynamic";

const DECISIONS: ClipDecision[] = ["approve", "skip"];
const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { decision?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const decision = body.decision as ClipDecision;
  if (!DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "decision must be 'approve' or 'skip'" }, { status: 400 });
  }
  const platform =
    body.platform && PLATFORMS.includes(body.platform as Platform)
      ? (body.platform as Platform)
      : undefined;

  const result = await recordClipDecision(id, decision, platform);
  return NextResponse.json(result);
}
