import { NextResponse } from "next/server";
import { tenantForApiKey } from "@/server/apikeys";
import { createStreamWithinQuota } from "@/server/limits";
import { checkIngestUrl } from "@/server/urlguard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * v1 developer API — submit a video for clipping.
 *   POST /api/v1/streams  Authorization: Bearer wcz_…
 *   { "url": "https://youtube.com/…", "title": "optional" }
 * → { id, status: "QUEUED" }
 */
export async function POST(req: Request) {
  const tenantId = await tenantForApiKey(req.headers.get("authorization"));
  if (!tenantId) return NextResponse.json({ error: "invalid or missing API key" }, { status: 401 });

  let body: { url?: unknown; title?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const guardErr = checkIngestUrl(body.url); // SSRF pre-check + protocol
  if (guardErr) return NextResponse.json({ error: guardErr }, { status: 400 });
  const parsed = new URL(body.url.trim());

  const created = await createStreamWithinQuota(tenantId, {
    title:
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : `API: ${parsed.hostname.replace(/^www\./, "")}`,
    status: "QUEUED",
    sourceUrl: parsed.toString(),
  });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 402 });
  return NextResponse.json({ id: created.id, status: "QUEUED" }, { status: 201 });
}
