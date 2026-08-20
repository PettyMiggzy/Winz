import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db";
import { getSessionTenantId } from "@/server/auth";
import { daysSince, warmupStateFor } from "@/lib/ramp";
import { planFor } from "@/lib/plans";
import {
  clips as seedClips,
  streams as seedStreams,
  accounts as seedAccounts,
  stats as seedStats,
  viewsSpark as seedSpark,
  CHANNEL,
  type Clip,
  type Account,
  type Platform,
  type ClipStatus,
} from "@/lib/mock";

/**
 * The single data-access layer for the dashboard. Every page and API route goes
 * through here. When DATABASE_URL is set it reads Prisma; otherwise it serves
 * the seed data from lib/mock so the app runs with zero configuration.
 *
 * Tenant scoping: for now we resolve a single tenant (WinslowBankz). When auth
 * lands, pass the authenticated tenantId into these functions instead.
 */

const TINTS = [
  "from-brand/30 to-violet/30",
  "from-magenta/30 to-brand/20",
  "from-violet/30 to-magenta/20",
  "from-brand/20 to-brand/5",
  "from-magenta/20 to-violet/20",
];
function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

function relTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  if (s < 172800) return "yesterday";
  return `${Math.floor(s / 86400)} days ago`;
}

const DB_TO_UI_STATUS: Record<string, ClipStatus> = {
  PENDING: "review",
  APPROVED: "scheduled",
  SCHEDULED: "scheduled",
  POSTED: "posted",
  SKIPPED: "skipped",
};

// ---------------------------------------------------------------- reads

export async function getClips(): Promise<Clip[]> {
  const prisma = getPrisma();
  if (!prisma) return seedClips;
  const tenantId = await getSessionTenantId();
  if (!tenantId) return [];

  const rows = await prisma.clip.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { stream: true, posts: true },
    take: 200,
  });
  const r2Base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return rows.map((c): Clip => {
    const posted = c.posts.find((p) => p.status === "POSTED");
    // Only cloud-stored clips are watchable; local-path keys from dev workers
    // have no public URL.
    const videoUrl =
      r2Base && c.storageKey && !c.storageKey.startsWith("/")
        ? `${r2Base}/${c.storageKey}`
        : undefined;
    return {
      videoUrl,
      lang: c.lang ?? undefined,
      id: c.id,
      title: c.title,
      hook: c.hook ?? "",
      durationSec: c.durationSec,
      score: c.score,
      signal: c.signal ?? "",
      stream: c.stream.title,
      createdAt: relTime(c.createdAt),
      status: DB_TO_UI_STATUS[c.status] ?? "review",
      assignedTo: c.assignedPlatform
        ? (c.assignedPlatform.toLowerCase() as Platform)
        : undefined,
      flaggedMusic: c.flaggedMusic,
      views: posted?.views ?? undefined,
      likes: posted?.likes ?? undefined,
      thumbTint: tintFor(c.id),
    };
  });
}

export async function getReviewClips(): Promise<Clip[]> {
  return (await getClips()).filter((c) => c.status === "review");
}

export async function getPostedClips(): Promise<Clip[]> {
  return (await getClips()).filter((c) => c.status === "posted");
}

export async function getStreams() {
  const prisma = getPrisma();
  if (!prisma) return seedStreams;
  const tenantId = await getSessionTenantId();
  if (!tenantId) return [];

  const rows = await prisma.stream.findMany({
    where: { tenantId },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { clips: true } }, clips: { include: { posts: true } } },
    take: 12,
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    date: relTime(s.startedAt),
    durationMin: Math.round((s.durationSec ?? 0) / 60),
    moments: s.momentsDetected || s._count.clips,
    posted: s.clips.filter((c) => c.posts.some((p) => p.status === "POSTED")).length,
  }));
}

export async function getAccounts(): Promise<Account[]> {
  const prisma = getPrisma();
  if (!prisma) return seedAccounts;
  const tenantId = await getSessionTenantId();
  if (!tenantId) return [];

  const rows = await prisma.socialAccount.findMany({
    where: { tenantId, platform: { not: "KICK" } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((a): Account => ({
    id: a.id,
    platform: a.platform.toLowerCase() as Platform,
    handle: a.handle,
    connected: a.connected,
    followers: a.followers ?? undefined,
    postsThisWeek: undefined,
    role: a.role.toLowerCase() as "main" | "clips",
    // Derive the state from connectedAt so it can't drift from warmupDay — the
    // stored enum has no code path that transitions it (WARMING→READY).
    warmupState: a.connected ? warmupStateFor(a.connectedAt) : "new",
    warmupDay: a.connectedAt ? daysSince(a.connectedAt) : undefined,
  }));
}

export async function getStats() {
  const prisma = getPrisma();
  if (!prisma) return { ...seedStats, spark: seedSpark };

  const tenantId = await getSessionTenantId();
  if (!tenantId) {
    return { clipsThisWeek: 0, viewsThisWeek: 0, viewsDeltaPct: 0, profileClicks: 0, newFollowers: 0, avgScore: 0, minutesToPost: 0, spark: Array(7).fill(0) };
  }
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [clipsThisWeek, posts, scoreAgg] = await Promise.all([
    prisma.clip.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
    prisma.post.findMany({ where: { tenantId, postedAt: { gte: weekAgo } }, select: { views: true, postedAt: true } }),
    prisma.clip.aggregate({ where: { tenantId }, _avg: { score: true } }),
  ]);
  const viewsThisWeek = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  // Real numbers only — zeros until posting/analytics generate data. Never mix
  // seed demo values into a configured database's dashboard.
  const spark = Array.from({ length: 7 }, (_, i) => {
    const dayStart = Date.now() - (6 - i) * 86400_000 - 86400_000;
    const dayEnd = dayStart + 86400_000;
    return posts
      .filter((p) => p.postedAt && p.postedAt.getTime() >= dayStart && p.postedAt.getTime() < dayEnd)
      .reduce((s, p) => s + (p.views ?? 0), 0);
  });
  return {
    clipsThisWeek,
    viewsThisWeek,
    viewsDeltaPct: 0,
    profileClicks: 0,
    newFollowers: 0,
    avgScore: Math.round(scoreAgg._avg.score ?? 0),
    minutesToPost: 0,
    spark,
  };
}

export function getChannel() {
  return CHANNEL;
}

/**
 * Queue a Dub row per configured language for a freshly approved ORIGINAL clip.
 * Skips dubbed clips (no dub-of-a-dub), workspaces with dubbing off, and plans
 * that don't include it. Unique (clipId, lang) makes re-approval idempotent.
 */
async function enqueueDubs(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  clipId: string,
  tenantId: string
): Promise<void> {
  const [clip, tenant] = await Promise.all([
    prisma.clip.findUnique({ where: { id: clipId }, select: { lang: true, storageKey: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, dubLanguages: true } }),
  ]);
  if (!clip || clip.lang) return; // already a dub — don't translate a translation
  if (!clip.storageKey || clip.storageKey.startsWith("/")) return; // not in cloud storage
  const wanted = (tenant?.dubLanguages ?? "")
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  if (wanted.length === 0) return;
  const cap = planFor(tenant?.plan ?? "FREE").dubLanguages;
  const langs = wanted.slice(0, cap);
  if (langs.length === 0) return;

  await prisma.dub.createMany({
    data: langs.map((lang) => ({ tenantId, clipId, lang })),
    skipDuplicates: true,
  });
}

export interface PostRow {
  id: string;
  clipTitle: string;
  platform: Platform;
  accountHandle: string;
  status: "scheduled" | "posting" | "posted" | "failed";
  when: string;
  externalUrl?: string;
}

/** Post history — what went (or is going) where. */
export async function getPosts(): Promise<PostRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  const tenantId = await getSessionTenantId();
  if (!tenantId) return [];

  const rows = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { clip: { select: { title: true } }, account: { select: { handle: true } } },
    take: 100,
  });
  return rows.map((p) => ({
    id: p.id,
    clipTitle: p.clip.title,
    platform: p.platform.toLowerCase() as Platform,
    accountHandle: p.account.handle,
    status: p.status.toLowerCase() as PostRow["status"],
    when: relTime(p.postedAt ?? p.scheduledFor ?? p.createdAt),
    externalUrl: p.externalUrl ?? undefined,
  }));
}

// --------------------------------------------------------------- writes

export type ClipDecision = "approve" | "skip";

export async function recordClipDecision(
  clipId: string,
  decision: ClipDecision,
  platform?: Platform,
  postMeta?: Record<string, unknown>
): Promise<{ ok: boolean; notFound?: boolean }> {
  const prisma = getPrisma();
  if (!prisma) {
    // Seed mode: nothing to persist. The UI updates optimistically.
    return { ok: true };
  }
  const tenantId = await getSessionTenantId();
  if (!tenantId) return { ok: false, notFound: true };
  // updateMany returns a count instead of throwing P2025 on a missing id —
  // and the tenant filter means you can only decide on your own clips.
  const res = await prisma.clip.updateMany({
    where: { id: clipId, tenantId },
    data: {
      status: decision === "approve" ? "APPROVED" : "SKIPPED",
      assignedPlatform: platform
        ? (platform.toUpperCase() as "TIKTOK" | "YOUTUBE" | "INSTAGRAM")
        : undefined,
    },
  });
  if (res.count === 0) return { ok: false, notFound: true };

  // On approve, queue translated versions (same voice) if the workspace wants
  // them. A dubbed clip is itself a Clip, so never dub a dub — that would loop.
  if (decision === "approve") {
    await enqueueDubs(prisma, clipId, tenantId);
  }

  // On approve, fan the clip out to the tenant's connected accounts as SCHEDULED
  // Posts. The worker's publish poller picks these up and posts them. Scope to
  // the chosen platform when one was picked; otherwise every connected platform.
  if (decision === "approve") {
    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      select: { tenantId: true, assignedPlatform: true },
    });
    if (clip) {
      const platformFilter = clip.assignedPlatform ?? undefined;
      const accounts = await prisma.socialAccount.findMany({
        where: {
          tenantId: clip.tenantId,
          connected: true,
          warmupState: { not: "NEW" }, // NEW accounts haven't started their ramp
          ...(platformFilter ? { platform: platformFilter } : {}),
        },
        select: { id: true, platform: true },
      });
      if (accounts.length > 0) {
        // Skip accounts that already have a live Post for this clip (idempotent
        // re-approve). FAILED posts don't count — re-approving retries them.
        const existing = await prisma.post.findMany({
          where: {
            clipId,
            accountId: { in: accounts.map((a) => a.id) },
            status: { not: "FAILED" },
          },
          select: { accountId: true },
        });
        const seen = new Set(existing.map((e) => e.accountId));
        const toCreate = accounts.filter((a) => !seen.has(a.id));
        if (toCreate.length > 0) {
          // Stagger: never post to two accounts at once. First goes out with a
          // small jitter, each next one 90–120 min later (spam-detection
          // guidance: >=90 min spacing, randomized, never simultaneous).
          let t = Date.now() + Math.floor(Math.random() * 5) * 60_000;
          await prisma.post.createMany({
            skipDuplicates: true, // partial-unique (clipId,accountId) backstops the race
            data: toCreate.map((a) => {
              const scheduledFor = new Date(t);
              t += (90 + Math.floor(Math.random() * 30)) * 60_000;
              return {
                tenantId: clip.tenantId,
                clipId,
                accountId: a.id,
                platform: a.platform,
                status: "SCHEDULED" as const,
                scheduledFor,
                // Publish options chosen at approval (TikTok privacy etc.).
                ...(postMeta && a.platform === "TIKTOK"
                  ? { meta: postMeta as Prisma.InputJsonValue }
                  : {}),
              };
            }),
          });
          await prisma.clip.update({ where: { id: clipId }, data: { status: "SCHEDULED" } });
        }
      }
    }
  }
  return { ok: true };
}
