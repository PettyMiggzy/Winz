import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { getSessionTenantId } from "@/server/auth";
import { createStreamWithinQuota } from "@/server/limits";
import { checkIngestUrl } from "@/server/urlguard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingest a video by URL (YouTube, Twitch, Kick, a direct MP4, …). We store the
 * link as the stream's sourceUrl and mark it QUEUED — the worker downloads it
 * (via yt-dlp for platform links, or a direct fetch for media files) and clips
 * it. No sourceKey means "remote link, fetch it" to the worker.
 *
 * Rights note: only submit content you own or have permission to use.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const { url, title: rawTitle } = body as Record<string, unknown>;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const guardErr = checkIngestUrl(url); // SSRF pre-check + protocol validation
  if (guardErr) return NextResponse.json({ error: guardErr }, { status: 400 });
  const parsed = new URL(url.trim());

  const title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim().slice(0, 120)
      : `Link: ${parsed.hostname.replace(/^www\./, "")}`;

  const prisma = getPrisma();
  if (prisma) {
    const tenantId = await getSessionTenantId();
    if (!tenantId) return NextResponse.json({ error: "sign in to add videos" }, { status: 401 });
    const created = await createStreamWithinQuota(tenantId, {
      title,
      status: "QUEUED",
      sourceUrl: parsed.toString(),
      // no sourceKey → the worker treats sourceUrl as a link to download
    });
    if (!created.ok) return NextResponse.json({ error: created.error }, { status: 402 });
    return NextResponse.json({ ok: true, streamId: created.id });
  }

  return NextResponse.json({
    ok: true,
    streamId: `demo_${Date.now().toString(36)}`,
    note: "Demo mode — connect a database + the worker to process real links.",
  });
}
