import { NextResponse } from "next/server";
import { readSignatureHeaders, verifyWebhookSignature, getLatestVodUrl } from "@/lib/kick";
import { getPrisma } from "@/server/db";
import { createStreamWithinQuota } from "@/server/limits";

// Signature verification uses node:crypto → must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only these event kinds are ever persisted/acted on — anything else is a
// signed-by-Kick event for some other app and gets a cheap ack, not a DB write.
const ALLOWED_EVENTS = new Set(["livestream.status.updated"]);
const MAX_BODY_BYTES = 64 * 1024; // Kick events are tiny; cap to prevent DB spam

/**
 * Kick event webhook — the auto-clip trigger.
 *
 * Verifies Kick's RSA signature, matches the broadcaster to a connected
 * workspace (a valid signature only proves "sent by Kick", NOT "sent for us"),
 * dedupes by message id, and on stream-end queues the VOD for clipping. The
 * streamer wakes up to finished clips without touching anything.
 */
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
  // accept forged events.
  const valid = await verifyWebhookSignature(rawBody, sig).catch(() => false);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  let payload: {
    is_live?: boolean;
    title?: string;
    started_at?: string;
    ended_at?: string | null;
    broadcaster?: { user_id?: number; channel_slug?: string; username?: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: true, note: "no database" });

  // Bind the event to a workspace. Kick signs every app's webhooks with one
  // global key, so this — not the signature — is what proves the event is ours.
  const broadcasterId = payload.broadcaster?.user_id;
  if (!broadcasterId) return NextResponse.json({ ok: true, ignored: "no broadcaster" });
  const account = await prisma.socialAccount.findFirst({
    where: { platform: "KICK", externalId: String(broadcasterId), connected: true },
    select: { tenantId: true },
  });
  if (!account) {
    // Someone else's Kick app pointed at our URL, or a stale subscription.
    return NextResponse.json({ ok: true, ignored: "unknown broadcaster" });
  }

  // Idempotency: messageId is unique, so let the DB enforce it and treat a
  // duplicate-key error as a dedupe (avoids a check-then-create race).
  if (sig.messageId) {
    try {
      await prisma.webhookEvent.create({
        data: { source: "kick", kind: eventType, messageId: sig.messageId, payload: payload as object },
      });
    } catch (e) {
      if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      throw e;
    }
  }

  if (payload.is_live === false) {
    const slug = payload.broadcaster?.channel_slug ?? payload.broadcaster?.username;
    console.info("[kick] stream ended:", slug, payload.title);
    if (!slug) return NextResponse.json({ ok: true, note: "no channel slug" });

    // Kick publishes the VOD moments after the stream ends; if it's not there
    // yet we simply skip — the creator can still paste the link manually.
    const vodUrl = await getLatestVodUrl(slug);
    if (!vodUrl) {
      console.warn("[kick] no VOD found yet for", slug);
      return NextResponse.json({ ok: true, note: "no vod yet" });
    }

    const created = await createStreamWithinQuota(account.tenantId, {
      title: payload.title?.slice(0, 120) || `${slug} stream`,
      status: "QUEUED",
      sourceUrl: vodUrl,
      endedAt: payload.ended_at ? new Date(payload.ended_at) : new Date(),
    });
    if (!created.ok) {
      console.warn("[kick] auto-clip skipped (quota):", created.error);
      return NextResponse.json({ ok: true, note: "quota reached" });
    }
    console.info("[kick] queued VOD for auto-clipping:", vodUrl);
    return NextResponse.json({ ok: true, queued: created.id });
  }

  console.info("[kick] stream started:", payload.broadcaster?.channel_slug, payload.title);
  return NextResponse.json({ ok: true });
}
