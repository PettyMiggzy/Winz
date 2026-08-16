/**
 * Publish poller. Watches for SCHEDULED Post rows (created when a clip is
 * approved), claims each atomically, and posts the clip to its destination
 * account through the posting provider (Blotato today). DB-as-queue, same
 * pattern as the clip poller — no Redis.
 */
import { sql } from "../db.ts";
import { publicUrl } from "../r2.ts";
import { blotatoConfigured, publish, type Platform } from "./blotato.ts";

interface DuePost {
  id: string;
  clipId: string;
  accountId: string;
  platform: string; // Prisma enum: TIKTOK | YOUTUBE | INSTAGRAM
  title: string;
  caption: string | null;
  storageKey: string | null;
  externalAccountId: string | null; // Blotato account id (SocialAccount.externalId)
}

/** Claim the oldest due, SCHEDULED post (CAS on status). */
async function claimNext(): Promise<DuePost | null> {
  const rows = await sql<DuePost[]>`
    SELECT p.id, p."clipId", p."accountId", p.platform,
           c.title, c.hook AS caption, c."storageKey",
           a."externalId" AS "externalAccountId"
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
    UPDATE "Post" SET status = 'POSTING'
    WHERE id = ${p.id} AND status = 'SCHEDULED'`;
  return claim.count === 1 ? p : null; // lost the race → retry next tick
}

async function processOne(p: DuePost): Promise<void> {
  try {
    if (!p.storageKey) throw new Error("clip has no storageKey (not rendered/uploaded)");
    if (!p.externalAccountId) {
      throw new Error("account not linked to a posting provider (SocialAccount.externalId empty)");
    }
    const platform = p.platform.toLowerCase() as Platform;
    const res = await publish({
      accountId: p.externalAccountId,
      platform,
      mediaUrl: publicUrl(p.storageKey),
      title: p.title,
      caption: p.caption ?? p.title,
    });
    await sql`
      UPDATE "Post"
      SET status = 'POSTED', "postedAt" = now(),
          "externalId" = ${res.externalId ?? null}, "externalUrl" = ${res.url ?? null}
      WHERE id = ${p.id}`;
    await sql`UPDATE "Clip" SET status = 'POSTED' WHERE id = ${p.clipId}`;
    console.info(`[publish ${p.id}] posted to ${p.platform}`);
  } catch (e) {
    await sql`UPDATE "Post" SET status = 'FAILED' WHERE id = ${p.id}`;
    console.error(`[publish ${p.id}] failed:`, e instanceof Error ? e.message : e);
  }
}

export async function runPublishPoller(intervalMs = 7000): Promise<void> {
  if (!blotatoConfigured()) {
    console.info("[winclipz-worker] BLOTATO_API_KEY not set — publish poller idle (clips still cut, just not auto-posted).");
    return;
  }
  console.info("[winclipz-worker] publish poller watching for approved clips…");
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
