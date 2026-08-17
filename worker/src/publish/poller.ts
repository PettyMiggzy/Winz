/**
 * Publish poller. Watches for SCHEDULED Post rows (created when a clip is
 * approved), claims each atomically, and posts the clip to its destination
 * account through the posting provider (Blotato today). DB-as-queue, same
 * pattern as the clip poller — no Redis.
 */
import { sql } from "../db.ts";
import { publicUrl } from "../r2.ts";
import * as blotato from "./blotato.ts";
import * as uploadpost from "./uploadpost.ts";
import * as tiktok from "./tiktok.ts";
import * as instagram from "./instagram.ts";
import type { Platform } from "./uploadpost.ts";

/**
 * Provider selection: upload-post first (researched pick — cheapest with the
 * TikTok audit covered), Blotato as the documented fallback. Whichever has an
 * API key configured wins; upload-post takes precedence if both are set.
 */
function provider() {
  if (uploadpost.uploadPostConfigured()) return { name: "upload-post", publish: uploadpost.publish };
  if (blotato.blotatoConfigured()) return { name: "blotato", publish: blotato.publish };
  return null;
}

interface DuePost {
  id: string;
  clipId: string;
  accountId: string;
  platform: string; // Prisma enum: TIKTOK | YOUTUBE | INSTAGRAM
  title: string;
  caption: string | null;
  storageKey: string | null;
  externalAccountId: string | null; // provider account/profile id (SocialAccount.externalId)
  hasOwnToken: boolean; // account connected via our own OAuth app
  meta: Record<string, unknown> | null; // per-post options chosen at approval
  attempts: number | null;
}

/** Claim the oldest due, SCHEDULED post (CAS on status). */
async function claimNext(): Promise<DuePost | null> {
  const rows = await sql<DuePost[]>`
    SELECT p.id, p."clipId", p."accountId", p.platform, p.meta, p.attempts,
           c.title, c.hook AS caption, c."storageKey",
           a."externalId" AS "externalAccountId",
           (a."accessToken" IS NOT NULL) AS "hasOwnToken"
    FROM "Post" p
    JOIN "Clip" c ON c.id = p."clipId"
    JOIN "SocialAccount" a ON a.id = p."accountId"
    WHERE p.status = 'SCHEDULED'
      AND (p."scheduledFor" IS NULL OR p."scheduledFor" <= now())
    ORDER BY p."createdAt" ASC
    LIMIT 1`;
  if (rows.length === 0) return null;
  const p = rows[0];
  const claim = await sql`
    UPDATE "Post" SET status = 'POSTING', "claimedAt" = now(), "attempts" = "attempts" + 1
    WHERE id = ${p.id} AND status = 'SCHEDULED'`;
  return claim.count === 1 ? p : null; // lost the race → retry next tick
}

const MAX_POST_ATTEMPTS = 3;

async function processOne(p: DuePost): Promise<void> {
  try {
    if (!p.storageKey) throw new Error("clip has no storageKey (not rendered/uploaded)");
    const platform = p.platform.toLowerCase() as Platform;
    const mediaUrl = publicUrl(p.storageKey);

    let res: { externalId?: string; url?: string };
    if (platform === "tiktok" && p.hasOwnToken && tiktok.tiktokConfigured()) {
      // In-house TikTok (our own app): direct post in sandbox/audited mode,
      // drafts mode otherwise (TIKTOK_POST_MODE=draft).
      res = await tiktok.publishToTikTok({
        socialAccountId: p.accountId,
        mediaUrl,
        caption: p.caption ?? p.title,
        meta: (p.meta ?? {}) as tiktok.TikTokMeta,
      });
    } else if (platform === "instagram" && p.hasOwnToken) {
      // In-house Instagram (Standard Access — no review needed for own accounts).
      res = await instagram.publishToInstagram({
        socialAccountId: p.accountId,
        mediaUrl,
        caption: p.caption ?? p.title,
      });
    } else {
      if (!p.externalAccountId) {
        throw new Error("account not linked to a posting provider (SocialAccount.externalId empty)");
      }
      const prov = provider();
      if (!prov) throw new Error("no posting provider configured");
      res = await prov.publish({
        accountId: p.externalAccountId,
        platform,
        mediaUrl,
        title: p.title,
        caption: p.caption ?? p.title,
        meta: (p.meta ?? undefined) as Record<string, unknown> | undefined,
      });
    }
    // Guard with status='POSTING' so a reaper-requeued duplicate can't double-write.
    await sql`
      UPDATE "Post"
      SET status = 'POSTED', "postedAt" = now(),
          "externalId" = ${res.externalId ?? null}, "externalUrl" = ${res.url ?? null}
      WHERE id = ${p.id} AND status = 'POSTING'`;
    await sql`UPDATE "Clip" SET status = 'POSTED' WHERE id = ${p.clipId}`;
    console.info(`[publish ${p.id}] posted to ${p.platform}`);
  } catch (e) {
    // Bounded retry: requeue (SCHEDULED) until MAX attempts, then FAIL. Handles
    // transient provider/network/DB blips without permanently killing a post.
    const attempts = (p.attempts ?? 0) + 1;
    const terminal = attempts >= MAX_POST_ATTEMPTS;
    await sql`
      UPDATE "Post" SET status = ${terminal ? "FAILED" : "SCHEDULED"}, "claimedAt" = NULL
      WHERE id = ${p.id} AND status = 'POSTING'`;
    console.error(
      `[publish ${p.id}] ${terminal ? "failed (gave up)" : `error, will retry (${attempts}/${MAX_POST_ATTEMPTS})`}:`,
      e instanceof Error ? e.message : e
    );
  }
}

export async function runPublishPoller(intervalMs = 7000): Promise<void> {
  const prov = provider();
  const inHouse = [
    tiktok.tiktokConfigured() ? "in-house TikTok" : null,
    "in-house Instagram", // token-gated per account; no global key needed
  ].filter(Boolean).join(" + ");
  if (!prov && !inHouse) {
    console.info("[winclipz-worker] no posting provider configured (set UPLOADPOST_API_KEY / BLOTATO_API_KEY / TIKTOK_CLIENT_KEY) — publish poller idle (clips still cut, just not auto-posted).");
    return;
  }
  console.info(
    `[winclipz-worker] publish poller watching for approved clips… (${[prov?.name, inHouse].filter(Boolean).join(" + ")})`
  );
  let stop = false;
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => { stop = true; });
  }
  while (!stop) {
    try {
      const p = await claimNext();
      if (p) await processOne(p);
      else await new Promise((r) => setTimeout(r, intervalMs));
    } catch (e) {
      console.error("[winclipz-worker] publish poll error:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  console.info("[winclipz-worker] publish poller stopped");
}
