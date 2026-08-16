// Mock data for the dashboard UI. Replace with real API/DB wiring in Phase 1.
// Everything here is illustrative — tenant #1 is "WinslowBankz".

export const CHANNEL = {
  name: "WinslowBankz",
  kickUrl: "kick.com/WinslowBankz",
  handle: "@winslowbankz",
};

export type Platform = "tiktok" | "youtube" | "instagram";
export type ClipStatus = "review" | "scheduled" | "posted" | "skipped";

export interface Clip {
  id: string;
  title: string;
  hook: string;
  durationSec: number;
  score: number; // 0-100 virality score
  signal: string; // why it was picked
  stream: string;
  createdAt: string;
  status: ClipStatus;
  assignedTo?: Platform;
  flaggedMusic?: boolean;
  views?: number;
  likes?: number;
  thumbTint: string; // gradient class for the placeholder thumb
}

export const clips: Clip[] = [
  {
    id: "clip_9f2",
    title: "he did NOT expect that clutch 💀",
    hook: "down 1v4, then this happens",
    durationSec: 24,
    score: 94,
    signal: "chat spike + audio peak",
    stream: "Warzone ranked grind",
    createdAt: "12 min ago",
    status: "review",
    assignedTo: "tiktok",
    thumbTint: "from-brand/30 to-violet/30",
  },
  {
    id: "clip_8a1",
    title: "chat went feral over this 😭",
    hook: "you have to see his reaction",
    durationSec: 18,
    score: 91,
    signal: "chat velocity z=4.1",
    stream: "Warzone ranked grind",
    createdAt: "14 min ago",
    status: "review",
    assignedTo: "youtube",
    thumbTint: "from-magenta/30 to-brand/20",
  },
  {
    id: "clip_7c4",
    title: "the timing on this is insane",
    hook: "wait for it…",
    durationSec: 27,
    score: 88,
    signal: "audio peak + laughter",
    stream: "Warzone ranked grind",
    createdAt: "16 min ago",
    status: "review",
    assignedTo: "instagram",
    flaggedMusic: true,
    thumbTint: "from-violet/30 to-magenta/20",
  },
  {
    id: "clip_6b0",
    title: "POV: you queue into a movement demon",
    hook: "this shouldn't be legal",
    durationSec: 21,
    score: 85,
    signal: "transcript: hype quote",
    stream: "Warzone ranked grind",
    createdAt: "18 min ago",
    status: "review",
    assignedTo: "tiktok",
    thumbTint: "from-brand/20 to-brand/5",
  },
  {
    id: "clip_5z9",
    title: "bro really said that on stream 💀",
    hook: "unfiltered winslow moment",
    durationSec: 16,
    score: 82,
    signal: "chat spike",
    stream: "Just chatting w/ the boys",
    createdAt: "2 hrs ago",
    status: "scheduled",
    assignedTo: "youtube",
    thumbTint: "from-magenta/20 to-violet/20",
  },
  {
    id: "clip_4y8",
    title: "the funniest 20 seconds of the stream",
    hook: "i can't stop replaying this",
    durationSec: 20,
    score: 90,
    signal: "audio + chat + laughter",
    stream: "Just chatting w/ the boys",
    createdAt: "yesterday",
    status: "posted",
    assignedTo: "tiktok",
    views: 148200,
    likes: 21400,
    thumbTint: "from-brand/30 to-magenta/20",
  },
  {
    id: "clip_3x7",
    title: "he called his shot AND hit it",
    hook: "confidence level: unreal",
    durationSec: 23,
    score: 87,
    signal: "chat velocity z=3.6",
    stream: "Just chatting w/ the boys",
    createdAt: "yesterday",
    status: "posted",
    assignedTo: "instagram",
    views: 63800,
    likes: 8100,
    thumbTint: "from-violet/30 to-brand/20",
  },
  {
    id: "clip_2w6",
    title: "when the whole lobby turns on you",
    hook: "and he STILL won",
    durationSec: 25,
    score: 79,
    signal: "audio peak",
    stream: "Late night ranked",
    createdAt: "2 days ago",
    status: "posted",
    assignedTo: "youtube",
    views: 42100,
    likes: 5200,
    thumbTint: "from-brand/20 to-violet/20",
  },
];

export const streams = [
  { id: "s1", title: "Warzone ranked grind", date: "Today", durationMin: 184, moments: 12, posted: 0 },
  { id: "s2", title: "Just chatting w/ the boys", date: "Yesterday", durationMin: 142, moments: 9, posted: 6 },
  { id: "s3", title: "Late night ranked", date: "2 days ago", durationMin: 208, moments: 14, posted: 11 },
  { id: "s4", title: "Subathon day 1", date: "5 days ago", durationMin: 421, moments: 27, posted: 24 },
];

export type WarmupState = "new" | "warming" | "ready";

export interface Account {
  id: string;
  platform: Platform;
  handle: string;
  connected: boolean;
  followers?: number;
  postsThisWeek?: number;
  role: "main" | "clips";
  warmupState: WarmupState;
  warmupDay?: number; // days into the 14-day ramp (for warming accounts)
}

export const accounts: Account[] = [
  { id: "a1", platform: "tiktok", handle: "@winslowbankz", connected: true, followers: 18400, postsThisWeek: 14, role: "main", warmupState: "ready" },
  { id: "a2", platform: "tiktok", handle: "@winslowclips", connected: true, followers: 6200, postsThisWeek: 12, role: "clips", warmupState: "ready" },
  { id: "a3", platform: "youtube", handle: "WinslowBankz", connected: true, followers: 9100, postsThisWeek: 10, role: "main", warmupState: "ready" },
  { id: "a4", platform: "youtube", handle: "Winslow Clips", connected: true, followers: 640, postsThisWeek: 4, role: "clips", warmupState: "warming", warmupDay: 6 },
  { id: "a5", platform: "instagram", handle: "@winslowbankz", connected: true, followers: 5400, postsThisWeek: 9, role: "main", warmupState: "ready" },
  { id: "a6", platform: "instagram", handle: "@winslow.clips", connected: false, role: "clips", warmupState: "new" },
];

export const stats = {
  clipsThisWeek: 38,
  viewsThisWeek: 512400,
  viewsDeltaPct: 34,
  profileClicks: 4120,
  newFollowers: 1340,
  avgScore: 86,
  minutesToPost: 6,
};

export const viewsSpark = [12, 18, 15, 22, 28, 24, 31, 27, 35, 44, 39, 52];

/** Compact number formatting for stat tiles: 512400 → "512.4K", 1020000 → "1M". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
