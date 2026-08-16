import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db";
import { daysSince, warmupStateFor } from "@/lib/ramp";
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

  const rows = await prisma.clip.findMany({
    orderBy: { createdAt: "desc" },
    include: { stream: true, posts: true },
    take: 200,
  });
  return rows.map((c): Clip => {
    const posted = c.posts.find((p) => p.status === "POSTED");
    return {
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

  const rows = await prisma.stream.findMany({
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

  const rows = await prisma.socialAccount.findMany({
    where: { platform: { not: "KICK" } },
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

  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [clipsThisWeek, posts, scoreAgg] = await Promise.all([
    prisma.clip.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.post.findMany({ where: { postedAt: { gte: weekAgo } }, select: { views: true, postedAt: true } }),
    prisma.clip.aggregate({ _avg: { score: true } }),
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
  // updateMany returns a count instead of throwing P2025 on a missing id.
  const res = await prisma.clip.updateMany({
    where: { id: clipId },
    data: {
      status: decision === "approve" ? "APPROVED" : "SKIPPED",
      assignedPlatform: platform
        ? (platform.toUpperCase() as "TIKTOK" | "YOUTUBE" | "INSTAGRAM")
        : undefined,
    },
  });
  if (res.count === 0) return { ok: false, notFound: true };

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
        // Skip accounts that already have a Post for this clip (idempotent re-approve).
        const existing = await prisma.post.findMany({
          where: { clipId, accountId: { in: accounts.map((a) => a.id) } },
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
