import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYOUTS = ["crop", "blurpad"] as const;

/**
 * Register an upload and queue it for the clip engine.
 *
 * Flow in production: the browser gets a presigned R2 URL, PUTs the file
 * straight to storage (Vercel's 4.5MB body limit rules out proxying), then the
 * worker picks up the QUEUED stream, processes it, and clips land in the review
 * queue. Here we create the Stream record; R2 presigning + the worker are wired
 * on deploy. In seed mode (no DB) we return a mock id so the UI flow works.
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
  const { filename, styleHint, layout } = body as {
    filename?: unknown;
    styleHint?: unknown;
    layout?: unknown;
  };
  if (typeof filename !== "string" || !filename.trim()) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (layout != null && !LAYOUTS.includes(layout as (typeof LAYOUTS)[number])) {
    return NextResponse.json({ error: "layout must be crop or blurpad" }, { status: 400 });
  }

  const title = filename.replace(/\.[a-z0-9]+$/i, "").slice(0, 120);
  const prisma = getPrisma();

  if (prisma) {
    const stream = await prisma.stream.create({
      data: {
        // TODO: resolve the authenticated tenant. Demo tenant for now.
        tenant: { connectOrCreate: { where: { kickSlug: "winslowbankz" }, create: { name: "WinslowBankz", kickSlug: "winslowbankz" } } },
        title,
        status: "PROCESSING",
      },
    });
    // TODO: presign an R2 PUT for `filename` and return uploadUrl; enqueue the
    // process job once the client confirms the upload completed.
    return NextResponse.json({ ok: true, streamId: stream.id, uploadUrl: null, queued: true });
  }

  // Seed mode
  return NextResponse.json({
    ok: true,
    streamId: `demo_${Date.now().toString(36)}`,
    uploadUrl: null,
    queued: false,
    note: "Demo mode — connect a database + the worker to process real uploads.",
    styleHint: typeof styleHint === "string" ? styleHint : undefined,
    layout: typeof layout === "string" ? layout : "crop",
  });
}
