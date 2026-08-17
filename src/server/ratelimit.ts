import { getPrisma } from "@/server/db";

/**
 * Fixed-window rate limiter backed by Postgres (works across serverless
 * instances, unlike in-memory). Atomic upsert-increment; a request is allowed
 * while the window's count is under `limit`. Fail-open on DB errors so a
 * transient blip never locks users out of login.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSec: number
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const prisma = getPrisma();
  if (!prisma) return { ok: true, retryAfterSec: 0 };
  const now = new Date();
  const reset = new Date(now.getTime() + windowSec * 1000);
  try {
    // One statement: insert the window, or (if present & unexpired) bump count;
    // if the window expired, reset it. Returns the current count + resetAt.
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" (bucket, count, "resetAt")
      VALUES (${bucket}, 1, ${reset})
      ON CONFLICT (bucket) DO UPDATE SET
        count = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit".count + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END
      RETURNING count, "resetAt"`;
    const row = rows[0];
    if (!row) return { ok: true, retryAfterSec: 0 };
    const retryAfterSec = Math.max(0, Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000));
    return { ok: row.count <= limit, retryAfterSec };
  } catch {
    return { ok: true, retryAfterSec: 0 }; // fail-open
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Reject cross-site auth POSTs (CSRF): the Origin must be our own host. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser / same-origin server calls have no Origin
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
