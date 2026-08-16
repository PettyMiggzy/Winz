import { NextResponse } from "next/server";
import { hasDatabase } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "winz-web",
    time: new Date().toISOString(),
    database: hasDatabase ? "configured" : "seed-fallback",
    kickConfigured: Boolean(process.env.KICK_CLIENT_ID),
  });
}
