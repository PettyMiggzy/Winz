import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db";
import { planFor } from "@/lib/plans";

/**
 * Plan-limit checks, shared by the dashboard routes and the v1 API. A tenant
 * over its monthly video quota gets a clear, actionable error.
 */

export interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number | null;
  plan: string;
  error?: string;
}

export async function checkVideoQuota(tenantId: string): Promise<UsageCheck> {
  const prisma = getPrisma()!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const plan = tenant?.plan ?? "FREE";
  const limits = planFor(plan);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const used = await prisma.stream.count({
    where: { tenantId, startedAt: { gte: monthStart } },
  });

  if (limits.videosPerMonth !== null && used >= limits.videosPerMonth) {
    return {
      allowed: false,
      used,
      limit: limits.videosPerMonth,
      plan,
      error: `Monthly video limit reached (${used}/${limits.videosPerMonth} on the ${limits.label} plan). Resets on the 1st.`,
    };
  }
  return { allowed: true, used, limit: limits.videosPerMonth, plan };
}

/**
 * Create a Stream atomically under the tenant's monthly quota. Count + insert
 * run in one serializable transaction so concurrent requests can't both slip
 * past the limit (the TOCTOU the standalone checkVideoQuota had). Returns the
 * created stream id, or a quota error.
 */
export async function createStreamWithinQuota(
  tenantId: string,
  data: Omit<Prisma.StreamUncheckedCreateInput, "tenantId">
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const prisma = getPrisma()!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  const limits = planFor(tenant?.plan ?? "FREE");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  try {
    const stream = await prisma.$transaction(
      async (tx) => {
        if (limits.videosPerMonth !== null) {
          const used = await tx.stream.count({ where: { tenantId, startedAt: { gte: monthStart } } });
          if (used >= limits.videosPerMonth) throw new QuotaError(limits.videosPerMonth, limits.label);
        }
        return tx.stream.create({ data: { ...data, tenantId } });
      },
      { isolationLevel: "Serializable" }
    );
    return { ok: true, id: stream.id };
  } catch (e) {
    if (e instanceof QuotaError) {
      return {
        ok: false,
        error: `Monthly video limit reached (${e.limit} on the ${e.label} plan). Resets on the 1st.`,
      };
    }
    throw e;
  }
}

class QuotaError extends Error {
  constructor(public limit: number, public label: string) {
    super("quota");
  }
}
