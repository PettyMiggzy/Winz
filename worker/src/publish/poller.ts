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

    let res: { externalId?: string; url?: string; pending?: boolean };
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
    // Guard every terminal write with status='POSTING' so a reaper-requeued
    // duplicate can't clobber the original's result.
    if (res.pending) {
      // Bytes delivered, platform still deciding. Saying "posted" here would be
      // a guess — and TikTok rejects uploads often enough (format, duration,
      // spam risk, revoked auth) that the guess would sometimes be wrong.
      await sql`
        UPDATE "Post"
        SET status = 'PROCESSING', "externalId" = ${res.externalId ?? null}, "claimedAt" = now()
        WHERE id = ${p.id} AND status = 'POSTING'`;
      console.info(`[publish ${p.id}] uploaded to ${p.platform} — awaiting confirmation`);
      return;
    }
    await sql`
      UPDATE "Post"
      SET status = 'POSTED', "postedAt" = now(), error = NULL,
          "externalId" = ${res.externalId ?? null}, "externalUrl" = ${res.url ?? null}
      WHERE id = ${p.id} AND status = 'POSTING'`;
    await sql`UPDATE "Clip" SET status = 'POSTED' WHERE id = ${p.clipId}`;
    console.info(`[publish ${p.id}] posted to ${p.platform}`);
  } catch (e) {
    // Bounded retry: requeue (SCHEDULED) until MAX attempts, then FAIL. Handles
    // transient provider/network/DB blips without permanently killing a post.
    const attempts = (p.attempts ?? 0) + 1;
    const terminal = attempts >= MAX_POST_ATTEMPTS;
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await sql`
      UPDATE "Post" SET status = ${terminal ? "FAILED" : "SCHEDULED"}, "claimedAt" = NULL,
                        error = ${msg}
      WHERE id = ${p.id} AND status = 'POSTING'`;
    console.error(
      `[publish ${p.id}] ${terminal ? "failed (gave up)" : `error, will retry (${attempts}/${MAX_POST_ATTEMPTS})`}:`,
      msg
    );
  }
}

/** Give TikTok this long to commit before calling the post a failure. */
const CONFIRM_DEADLINE_MIN = 30;

interface PendingPost {
  id: string;
  clipId: string;
  accountId: string;
  externalId: string | null;
  handle: string;
  claimedAt: Date | null;
}

/**
 * Chase uploads the platform hasn't committed to yet. Nothing here re-uploads —
 * it only asks "did it actually go live?" and writes down the answer, so a post
 * only reads as posted once TikTok says so.
 */
async function confirmPending(): Promise<void> {
  const rows = await sql<PendingPost[]>`
    SELECT p.id, p."clipId", p."accountId", p."externalId", p."claimedAt", a.handle
    FROM "Post" p JOIN "SocialAccount" a ON a.id = p."accountId"
    WHERE p.status = 'PROCESSING' AND p.platform = 'TIKTOK' AND p."externalId" IS NOT NULL
    ORDER BY p."claimedAt" ASC NULLS FIRST
    LIMIT 10`;
  for (const p of rows) {
    try {
      const outcome = await tiktok.fetchPublishStatus(p.accountId, p.externalId!);
      if (outcome.state === "pending") {
        const waited = p.claimedAt ? Date.now() - new Date(p.claimedAt).getTime() : 0;
        if (waited > CONFIRM_DEADLINE_MIN * 60_000) {
          await sql`
            UPDATE "Post" SET status = 'FAILED',
              error = ${`TikTok never confirmed the post within ${CONFIRM_DEADLINE_MIN} minutes`}
            WHERE id = ${p.id} AND status = 'PROCESSING'`;
          console.warn(`[publish ${p.id}] tiktok never confirmed — marked failed`);
        }
        continue;
      }
      if (outcome.state === "failed") {
        await sql`
          UPDATE "Post" SET status = 'FAILED', error = ${outcome.reason}
          WHERE id = ${p.id} AND status = 'PROCESSING'`;
        console.warn(`[publish ${p.id}] tiktok rejected the post: ${outcome.reason}`);
        continue;
      }
      // TikTok only hands back a post id for publicly-visible posts; a private
      // or inbox post is still a real success, it just has no link to give.
      const url = outcome.postId ? tiktok.postUrl(p.handle, outcome.postId) : null;
      await sql`
        UPDATE "Post" SET status = 'POSTED', "postedAt" = now(), "externalUrl" = ${url}, error = NULL
        WHERE id = ${p.id} AND status = 'PROCESSING'`;
      await sql`UPDATE "Clip" SET status = 'POSTED' WHERE id = ${p.clipId}`;
      console.info(
        `[publish ${p.id}] tiktok confirmed${outcome.inbox ? " (in the creator's inbox)" : ""}${url ? `: ${url}` : ""}`
      );
    } catch (e) {
      // A status check that errors is not evidence either way — leave the row
      // PROCESSING and try again; the deadline above is the backstop.
      console.warn(`[publish ${p.id}] status check failed:`, e instanceof Error ? e.message : e);
    }
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
  let tick = 0;
  while (!stop) {
    try {
      // ~every 70s. TikTok caps status checks at 30/min per user token, and a
      // 30-minute deadline needs nothing like per-tick polling.
      if (tick++ % 10 === 0) await confirmPending();
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
