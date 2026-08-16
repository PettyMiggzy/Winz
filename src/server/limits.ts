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
