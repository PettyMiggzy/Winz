import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYOUTS = new Set(["crop", "blurpad", "split"]);

/** Save the workspace's clip framing (and facecam rect for the split layout). */
export async function POST(req: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "demo mode" }, { status: 400 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });

  let body: { layout?: unknown; facecam?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const layout = typeof body.layout === "string" ? body.layout : "";
  if (!LAYOUTS.has(layout)) {
    return NextResponse.json({ error: "unknown layout" }, { status: 400 });
  }

  // facecam arrives as {x,y,w,h} fractions; stored as "x,y,w,h".
  let facecam: string | null = null;
  if (body.facecam && typeof body.facecam === "object") {
    const f = body.facecam as Record<string, unknown>;
    const nums = ["x", "y", "w", "h"].map((k) => Number(f[k]));
    const valid =
      nums.every((n) => Number.isFinite(n) && n >= 0 && n <= 1) && nums[2] > 0 && nums[3] > 0;
    if (!valid) return NextResponse.json({ error: "facecam values must be 0-1" }, { status: 400 });
    facecam = nums.map((n) => n.toFixed(4)).join(",");
  }
  // Split without a facecam silently falls back to a centre crop — say so
  // rather than letting the user think they've set up something they haven't.
  if (layout === "split" && !facecam) {
    return NextResponse.json(
      { error: "mark where your facecam sits to use the split layout" },
      { status: 400 }
    );
  }

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { clipLayout: layout, facecam },
  });
  return NextResponse.json({ ok: true, layout, facecam });
}
