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
// Only these event kinds are ever persisted/acted on — anything else is a
// signed-by-Kick event for some other app and gets a cheap ack, not a DB write.
const ALLOWED_EVENTS = new Set(["livestream.status.updated"]);
const MAX_BODY_BYTES = 64 * 1024; // Kick events are tiny; cap to prevent DB spam

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  const sig = readSignatureHeaders(req.headers);
  const eventType = req.headers.get("Kick-Event-Type") ?? "unknown";

  // ALWAYS require a valid signature before we persist or act. Verification
  // needs no env var (Kick's public key comes from its public API), so this
  // must not be gated on config — otherwise an un-Kicked-but-DB'd deploy would
  // accept forged events. Only skip when there is genuinely no crypto available
  // in the runtime (should never happen on the Node runtime).
  const valid = await verifyWebhookSignature(rawBody, sig).catch(() => false);
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  // NOTE: Kick signs every app's webhooks with one global key, so a valid
  // signature proves "sent by Kick", not "for us". Until per-tenant Kick
  // subscriptions are persisted, drop event kinds we don't handle (so a third
  // party can't spam our WebhookEvent table via their own Kick app) — and, once
  // subscriptions land, also match the broadcaster to a known tenant here.
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prisma = getPrisma();

  // Idempotency: the messageId column is unique, so let the DB enforce it and
  // treat a duplicate-key error as a dedupe (avoids a check-then-create race).
  if (prisma && sig.messageId) {
    try {
      await prisma.webhookEvent.create({
        data: {
          source: "kick",
          kind: eventType,
          messageId: sig.messageId,
          payload: payload as object,
        },
      });
    } catch (e) {
      if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      throw e;
    }
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
