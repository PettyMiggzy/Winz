import { NextResponse } from "next/server";
import { readSignatureHeaders, verifyWebhookSignature } from "@/lib/kick";
import { getPrisma } from "@/server/db";

// Signature verification uses node:crypto → must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick event webhook. Verifies the RSA-SHA256 signature, dedupes by message id,
 * and reacts to livestream.status.updated (the "stream started / ended" signal).
 * On stream-end this is where we create the Stream row and enqueue a processing
 * job for the worker.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = readSignatureHeaders(req.headers);
  const eventType = req.headers.get("Kick-Event-Type") ?? "unknown";

  // In production (Kick configured), require a valid signature.
  if (process.env.KICK_CLIENT_ID) {
    const valid = await verifyWebhookSignature(rawBody, sig).catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prisma = getPrisma();

  // Idempotency: record the message id; ignore replays.
  if (prisma && sig.messageId) {
    const seen = await prisma.webhookEvent.findUnique({ where: { messageId: sig.messageId } });
    if (seen) return NextResponse.json({ ok: true, deduped: true });
    await prisma.webhookEvent.create({
      data: {
        source: "kick",
        kind: eventType,
        messageId: sig.messageId,
        payload: payload as object,
      },
    });
  }

  if (eventType === "livestream.status.updated") {
    const p = payload as {
      is_live?: boolean;
      title?: string;
      started_at?: string;
      ended_at?: string | null;
      broadcaster?: { channel_slug?: string };
    };
    if (p.is_live === false) {
      // Stream just ended → this is the trigger. Create the stream + enqueue.
      // (Enqueue is wired when the worker/queue lands; logged for now.)
      console.info("[kick] stream ended:", p.broadcaster?.channel_slug, p.title);
      // TODO: prisma.stream.create({...}) + queue.add("process-stream", {...})
    } else if (p.is_live === true) {
      console.info("[kick] stream started:", p.broadcaster?.channel_slug, p.title);
    }
  }

  return NextResponse.json({ ok: true });
}
