import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { tenantForApiKey } from "@/server/apikeys";

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
  const prisma = getPrisma()!;

  let body: { url?: unknown; title?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(body.url.trim());
  } catch {
    return NextResponse.json({ error: "not a valid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });
  }

  const stream = await prisma.stream.create({
    data: {
      tenantId,
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 120)
          : `API: ${parsed.hostname.replace(/^www\./, "")}`,
      status: "QUEUED",
      sourceUrl: parsed.toString(),
    },
  });
  return NextResponse.json({ id: stream.id, status: "QUEUED" }, { status: 201 });
}
