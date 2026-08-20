/**
 * Kick chat over Pusher.
 *
 * Kick's own web client renders chat off a public Pusher WebSocket — no auth,
 * no rate limit, no per-message HTTP cost. The documented alternative (the
 * `chat.message.sent` webhook) caps unverified apps at 1,000 messages, which a
 * busy stream burns through in minutes, so the socket is the only option that
 * actually covers a full broadcast.
 *
 * The app key and channel shape are Kick's client-side constants, not a
 * contract — both are env-overridable so a rotation is a config change, not a
 * redeploy.
 */

export const PUSHER_KEY = process.env.KICK_PUSHER_KEY ?? "32cbd69e4b950bf97679";
export const PUSHER_CLUSTER = process.env.KICK_PUSHER_CLUSTER ?? "us2";
export const CHAT_MESSAGE_EVENT = "App\\Events\\ChatMessageEvent";

export function pusherUrl(key = PUSHER_KEY, cluster = PUSHER_CLUSTER): string {
  return `wss://ws-${cluster}.pusher.com/app/${key}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
}

export function chatChannel(chatroomId: string | number): string {
  return `chatrooms.${chatroomId}.v2`;
}

export type Frame =
  | { kind: "established"; socketId: string; activityTimeoutSec: number }
  | { kind: "subscribed"; channel: string }
  | { kind: "message"; at: number }
  | { kind: "ping" }
  | { kind: "pong" }
  | { kind: "error"; code: number | null; message: string }
  | { kind: "other"; event: string };

/**
 * Parse one Pusher frame. Pure — the socket plumbing around it is untestable
 * without a network, this isn't.
 *
 * Pusher double-encodes: the outer frame's `data` is itself a JSON *string*.
 * Message timestamps come from the payload's `created_at` when present; Kick
 * sometimes omits it, so the caller's receive time is the fallback.
 */
export function parseFrame(raw: string, now: number): Frame | null {
  let outer: { event?: string; data?: unknown; channel?: string };
  try {
    outer = JSON.parse(raw);
  } catch {
    return null;
  }
  const event = outer.event;
  if (typeof event !== "string") return null;

  const inner = (): Record<string, unknown> => {
    const d = outer.data;
    if (typeof d === "string") {
      try {
        return JSON.parse(d) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
  };

  switch (event) {
    case "pusher:connection_established": {
      const d = inner();
      return {
        kind: "established",
        socketId: typeof d.socket_id === "string" ? d.socket_id : "",
        activityTimeoutSec: typeof d.activity_timeout === "number" ? d.activity_timeout : 120,
      };
    }
    case "pusher_internal:subscription_succeeded":
      return { kind: "subscribed", channel: outer.channel ?? "" };
    case "pusher:ping":
      return { kind: "ping" };
    case "pusher:pong":
      return { kind: "pong" };
    case "pusher:error": {
      const d = inner();
      return {
        kind: "error",
        code: typeof d.code === "number" ? d.code : null,
        message: typeof d.message === "string" ? d.message : "unknown pusher error",
      };
    }
    case CHAT_MESSAGE_EVENT: {
      const d = inner();
      const created = typeof d.created_at === "string" ? Date.parse(d.created_at) : NaN;
      return { kind: "message", at: Number.isFinite(created) ? created : now };
    }
    default:
      return { kind: "other", event };
  }
}

export function subscribeFrame(channel: string): string {
  return JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel } });
}

export function pongFrame(): string {
  return JSON.stringify({ event: "pusher:pong", data: {} });
}

export function pingFrame(): string {
  return JSON.stringify({ event: "pusher:ping", data: {} });
}
