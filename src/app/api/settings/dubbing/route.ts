import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { planFor } from "@/lib/plans";
import { DUB_LANGUAGES } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Save which languages approved clips get auto-dubbed into. */
export async function POST(req: Request) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ error: "demo mode" }, { status: 400 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });

  let body: { languages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.languages)) {
    return NextResponse.json({ error: "languages must be an array" }, { status: 400 });
  }
  // Only known codes, de-duped, and never more than the plan allows.
  const cap = planFor(user.plan).dubLanguages;
  if (cap === 0) {
    return NextResponse.json(
      { error: "Dubbing isn't included on your plan yet." },
      { status: 402 }
    );
  }
  const langs = [...new Set(body.languages.filter((l): l is string => typeof l === "string"))]
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l in DUB_LANGUAGES);
  if (langs.length > cap) {
    return NextResponse.json(
      { error: `Your plan covers ${cap} language${cap === 1 ? "" : "s"}.` },
      { status: 402 }
    );
  }

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { dubLanguages: langs.join(",") || null },
  });
  return NextResponse.json({ ok: true, languages: langs });
}
