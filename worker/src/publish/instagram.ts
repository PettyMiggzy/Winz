/**
 * In-house Instagram adapter (our own Meta app, Instagram Login for Business).
 * For accounts you own/manage, Meta's Standard Access needs NO app review.
 *
 * Reels publish is a 2-step Graph flow:
 *   1. POST /{ig_id}/media  { media_type: REELS, video_url, caption }
 *   2. poll the container's status_code until FINISHED
 *   3. POST /{ig_id}/media_publish { creation_id }
 *
 * Tokens are 60-day long-lived; refreshed via /refresh_access_token when past
 * ~day 50 and persisted back to the account.
 */
import { sql } from "../db.ts";

const GRAPH = "https://graph.instagram.com/v21.0";

interface Account {
  id: string;
  externalId: string | null; // IG user id
  accessToken: string | null;
  tokenExpiresAt: Date | null;
}

async function accountFor(accountId: string): Promise<Account> {
  const rows = await sql<Account[]>`
    SELECT id, "externalId", "accessToken", "tokenExpiresAt"
    FROM "SocialAccount" WHERE id = ${accountId}`;
  if (rows.length === 0 || !rows[0].accessToken) throw new Error("account has no Instagram token");
  if (!rows[0].externalId) throw new Error("account has no Instagram user id");
  return rows[0];
}

/** Refresh a long-lived token when it's inside the last 10 days of life. */
async function freshToken(a: Account): Promise<string> {
  const soon = Date.now() + 10 * 86400_000;
  const stale = a.tokenExpiresAt && new Date(a.tokenExpiresAt).getTime() < soon;
  if (!stale) return a.accessToken!;
  const res = await fetch(
    `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(a.accessToken!)}`
  );
  if (!res.ok) return a.accessToken!; // refresh window not open yet — use as-is
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return a.accessToken!;
  await sql`
    UPDATE "SocialAccount"
    SET "accessToken" = ${json.access_token},
        "tokenExpiresAt" = ${json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null}
    WHERE id = ${a.id}`;
  return json.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function publishToInstagram(input: {
  /** WinClipz SocialAccount id. */
  socialAccountId: string;
  mediaUrl: string; // public R2 URL — IG fetches it server-side
  caption: string;
}): Promise<{ externalId?: string; url?: string }> {
  const account = await accountFor(input.socialAccountId);
  const token = await freshToken(account);
  const igId = account.externalId!;

  // 1. create the Reels container
  const create = await fetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: input.mediaUrl,
      caption: input.caption.slice(0, 2200),
      access_token: token,
    }),
  });
  if (!create.ok) throw new Error(`ig media ${create.status}: ${(await create.text()).slice(0, 300)}`);
  const { id: containerId } = (await create.json()) as { id?: string };
  if (!containerId) throw new Error("ig media returned no container id");

  // 2. wait for processing (IG downloads + transcodes the video)
  let finished = false;
  for (let i = 0; i < 30 && !finished; i++) {
    await sleep(6000);
    const st = await fetch(
      `${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`
    );
    if (!st.ok) continue;
    const body = (await st.json()) as { status_code?: string; status?: string };
    if (body.status_code === "FINISHED") finished = true;
    else if (body.status_code === "ERROR") throw new Error(`ig container failed: ${body.status ?? "ERROR"}`);
  }
  // A failed final poll must NOT fall through and publish an unfinished container.
  if (!finished) throw new Error("ig container processing timed out (~3 min)");

  // 3. publish
  const pub = await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  if (!pub.ok) throw new Error(`ig publish ${pub.status}: ${(await pub.text()).slice(0, 300)}`);
  const { id: mediaId } = (await pub.json()) as { id?: string };

  // permalink is a nice-to-have; failure to fetch it shouldn't fail the post
  let url: string | undefined;
  if (mediaId) {
    try {
      const perma = await fetch(
        `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`
      );
      if (perma.ok) url = ((await perma.json()) as { permalink?: string }).permalink;
    } catch {
      /* ignore */
    }
  }
  return { externalId: mediaId, url };
}
