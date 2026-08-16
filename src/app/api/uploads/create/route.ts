import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { r2Configured, presignPut, publicUrl } from "@/server/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYOUTS = ["crop", "blurpad"] as const;

/**
 * Register an upload and (when R2 is configured) presign a direct browser→R2
 * PUT. The client uploads the file, then calls /api/uploads/[id]/complete to
 * mark the stream QUEUED; the worker polls for QUEUED streams and processes
 * them. In seed mode (no DB) we return a mock id so the UI flow still works.
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
  const { filename, contentType, styleHint, layout } = body as Record<string, unknown>;
  if (typeof filename !== "string" || !filename.trim()) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (layout != null && !LAYOUTS.includes(layout as (typeof LAYOUTS)[number])) {
    return NextResponse.json({ error: "layout must be crop or blurpad" }, { status: 400 });
  }

  const title = filename.replace(/\.[a-z0-9]+$/i, "").slice(0, 120);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `uploads/winslowbankz/${Date.now().toString(36)}-${safeName}`;
  const prisma = getPrisma();

  if (prisma) {
    const uploadUrl = r2Configured
      ? await presignPut(key, typeof contentType === "string" ? contentType : "video/mp4")
      : null;
    const stream = await prisma.stream.create({
      data: {
        tenant: {
          connectOrCreate: {
            where: { kickSlug: "winslowbankz" },
            create: { name: "WinslowBankz", kickSlug: "winslowbankz" },
          },
        },
        title,
        status: uploadUrl ? "UPLOADING" : "QUEUED",
        sourceKey: key,
        sourceUrl: r2Configured ? publicUrl(key) : null,
      },
    });
    return NextResponse.json({
      ok: true,
      streamId: stream.id,
      uploadUrl,
      styleHint: typeof styleHint === "string" ? styleHint : undefined,
      layout: typeof layout === "string" ? layout : "crop",
    });
  }

  // Seed mode — no DB configured.
  return NextResponse.json({
    ok: true,
    streamId: `demo_${Date.now().toString(36)}`,
    uploadUrl: null,
    note: "Demo mode — connect a database + R2 + the worker to process real uploads.",
  });
}
