import { getPrisma } from "@/server/db";
import { daysSince } from "@/lib/ramp";
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
    warmupState: a.warmupState.toLowerCase() as Account["warmupState"],
    warmupDay: a.connectedAt ? daysSince(a.connectedAt) : undefined,
  }));
}

export async function getStats() {
  const prisma = getPrisma();
  if (!prisma) return { ...seedStats, spark: seedSpark };

  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [clipsThisWeek, posts] = await Promise.all([
    prisma.clip.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.post.findMany({ where: { postedAt: { gte: weekAgo } }, select: { views: true } }),
  ]);
  const viewsThisWeek = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  return {
    clipsThisWeek,
    viewsThisWeek,
    viewsDeltaPct: seedStats.viewsDeltaPct,
    profileClicks: seedStats.profileClicks,
    newFollowers: seedStats.newFollowers,
    avgScore: seedStats.avgScore,
    minutesToPost: seedStats.minutesToPost,
    spark: seedSpark,
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
  platform?: Platform
): Promise<{ ok: boolean }> {
  const prisma = getPrisma();
  if (!prisma) {
    // Seed mode: nothing to persist. The UI updates optimistically.
    return { ok: true };
  }
  await prisma.clip.update({
    where: { id: clipId },
    data: {
      status: decision === "approve" ? "APPROVED" : "SKIPPED",
      assignedPlatform: platform
        ? (platform.toUpperCase() as "TIKTOK" | "YOUTUBE" | "INSTAGRAM")
        : undefined,
    },
  });
  // TODO: on approve, enqueue a publish job for the worker.
  return { ok: true };
}
