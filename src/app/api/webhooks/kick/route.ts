import { NextResponse } from "next/server";
import { readSignatureHeaders, verifyWebhookSignature } from "@/lib/kick";
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
 * Kick delivers events by POST. A GET (someone checking the URL in a browser,
 * or a provider-side reachability probe) gets a plain 200 instead of a 405 that
 * looks like the endpoint is broken.
 */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "kick-webhook", accepts: "POST" });
}

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

  const slug = payload.broadcaster?.channel_slug ?? payload.broadcaster?.username;
  if (!slug) return NextResponse.json({ ok: true, note: "no channel slug" });

  if (payload.is_live === false) {
    console.info("[kick] stream ended:", slug, payload.title);

    // Close the live chat recording and hand it to the clip job. Chat velocity
    // only exists if we captured it while the stream was on air — after the
    // fact it's gone, so a stream that started before this workspace connected
    // simply has no capture to attach.
    // Chat capture is an enhancement, never a gate: if any of it fails the VOD
    // still gets queued below. Losing the signal costs clip quality; letting it
    // throw here would cost the whole auto-clip.
    const capture = await prisma.chatCapture
      .findFirst({
        where: { tenantId: account.tenantId, broadcasterId: String(broadcasterId), endedAt: null },
        orderBy: { streamStartedAt: "desc" },
        select: { id: true },
      })
      .catch(() => null);
    if (capture) {
      await prisma.chatCapture
        .update({
          where: { id: capture.id },
          data: { endedAt: payload.ended_at ? new Date(payload.ended_at) : new Date() },
        })
        .catch((e) => console.warn("[kick] could not close chat capture:", e));
    }

    // Queue the channel, not a URL: Kick publishes the VOD minutes after the
    // stream ends, and kick.com's VOD list 403s datacenter IPs anyway. The
    // worker resolves it through the residential proxy and retries until it
    // appears — resolving here would mean giving up on the first miss.
    const created = await createStreamWithinQuota(account.tenantId, {
      title: payload.title?.slice(0, 120) || `${slug} stream`,
      status: "QUEUED",
      sourceUrl: `kick-latest:${slug}`,
      chatCaptureId: capture?.id ?? null,
      endedAt: payload.ended_at ? new Date(payload.ended_at) : new Date(),
    });
    if (!created.ok) {
      console.warn("[kick] auto-clip skipped (quota):", created.error);
      return NextResponse.json({ ok: true, note: "quota reached" });
    }
    console.info("[kick] queued", slug, "for auto-clipping (chat:", capture?.id ?? "none", ")");
    return NextResponse.json({ ok: true, queued: created.id });
  }

  console.info("[kick] stream started:", slug, payload.title);
  // Start recording chat velocity for the whole broadcast. The worker picks
  // this up within seconds and holds a socket open until the stream ends.
  if (payload.is_live === true) {
    try {
      const open = await prisma.chatCapture.findFirst({
        where: { tenantId: account.tenantId, broadcasterId: String(broadcasterId), endedAt: null },
        select: { id: true },
      });
      if (!open) {
        const started = payload.started_at ? new Date(payload.started_at) : new Date();
        const capture = await prisma.chatCapture.create({
          data: {
            tenantId: account.tenantId,
            broadcasterId: String(broadcasterId),
            slug,
            // Kick's own start time, not ours — every chat offset is measured
            // from it and matched against a VOD that starts at the same instant.
            streamStartedAt: Number.isNaN(started.getTime()) ? new Date() : started,
          },
        });
        console.info("[kick] chat capture queued:", capture.id, slug);
      }
    } catch (e) {
      // Same rule: no chat signal is survivable, a 500 back to Kick isn't.
      console.warn("[kick] could not start chat capture:", e);
    }
  }
  return NextResponse.json({ ok: true });
}
