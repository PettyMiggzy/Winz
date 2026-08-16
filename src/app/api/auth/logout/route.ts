import { NextResponse } from "next/server";
import { signOut } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/", new URL(req.url).origin), 303);
}
