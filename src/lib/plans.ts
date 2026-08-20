/**
 * Plan definitions — the product's pricing skeleton. Limits are enforced at
 * ingestion (uploads / links / API) per calendar month. ADMIN = founder
 * accounts, unlimited. Numbers are beta-generous; tune before paid launch.
 */

export interface PlanLimits {
  label: string;
  videosPerMonth: number | null; // null = unlimited
  accountsPerPlatform: number;
  /** Max languages a clip can be auto-dubbed into (0 = dubbing off). Dubbing
   *  has real per-minute cost, so it's a paid-tier feature. */
  dubLanguages: number;
}

export const PLANS: Record<string, PlanLimits> = {
  ADMIN: { label: "Founder", videosPerMonth: null, accountsPerPlatform: 99, dubLanguages: 10 },
  PRO: { label: "Pro", videosPerMonth: 100, accountsPerPlatform: 4, dubLanguages: 3 },
  FREE: { label: "Free beta", videosPerMonth: 10, accountsPerPlatform: 1, dubLanguages: 0 },
};

export function planFor(plan: string): PlanLimits {
  return PLANS[plan] ?? PLANS.FREE;
}
