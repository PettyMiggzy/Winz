import { NextResponse } from "next/server";
import { recordClipDecision, type ClipDecision } from "@/server/store";
import type { Platform } from "@/lib/mock";

export const dynamic = "force-dynamic";

const DECISIONS: ClipDecision[] = ["approve", "skip"];
const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const { decision: rawDecision, platform: rawPlatform, tiktokOptions } = body as {
    decision?: unknown;
    platform?: unknown;
    tiktokOptions?: unknown;
  };

  const decision = rawDecision as ClipDecision;
  if (!DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "decision must be 'approve' or 'skip'" }, { status: 400 });
  }
  // A present-but-invalid platform is an error, not a silent no-op.
  if (rawPlatform != null && !PLATFORMS.includes(rawPlatform as Platform)) {
    return NextResponse.json({ error: "platform must be tiktok, youtube, or instagram" }, { status: 400 });
  }
  const platform = rawPlatform != null ? (rawPlatform as Platform) : undefined;

  // TikTok requires a user-chosen privacy level per post (no defaults).
  let postMeta: Record<string, unknown> | undefined;
  if (platform === "tiktok" && decision === "approve") {
    const opts = tiktokOptions as { privacyLevel?: unknown } | undefined;
    if (!opts || typeof opts.privacyLevel !== "string" || !opts.privacyLevel) {
      return NextResponse.json(
        { error: "tiktokOptions.privacyLevel is required for TikTok approvals" },
        { status: 400 }
      );
    }
    postMeta = opts as Record<string, unknown>;
  }

  const result = await recordClipDecision(id, decision, platform, postMeta);
  if (result.notFound) {
    return NextResponse.json({ error: "clip not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
