/**
 * Plan definitions — the product's pricing skeleton. Limits are enforced at
 * ingestion (uploads / links / API) per calendar month. ADMIN = founder
 * accounts, unlimited. Numbers are beta-generous; tune before paid launch.
 */

export interface PlanLimits {
  label: string;
  videosPerMonth: number | null; // null = unlimited
  accountsPerPlatform: number;
}

export const PLANS: Record<string, PlanLimits> = {
  ADMIN: { label: "Founder", videosPerMonth: null, accountsPerPlatform: 99 },
  PRO: { label: "Pro", videosPerMonth: 100, accountsPerPlatform: 4 },
  FREE: { label: "Free beta", videosPerMonth: 10, accountsPerPlatform: 1 },
};

export function planFor(plan: string): PlanLimits {
  return PLANS[plan] ?? PLANS.FREE;
}
