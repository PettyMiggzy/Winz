import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ClipThumb } from "@/components/dashboard/ClipThumb";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconArrow, IconInbox, IconClock, IconCheck } from "@/components/Icons";
import { getStats, getStreams, getClips } from "@/server/store";

export default async function Overview() {
  const [stats, streams, clips] = await Promise.all([getStats(), getStreams(), getClips()]);
  const recentPosted = clips.filter((c) => c.status === "posted").slice(0, 4);
  const reviewCount = clips.filter((c) => c.status === "review").length;

  return (
    <>
      <Topbar title="Overview" subtitle="Here's what your streams are doing across every platform." />
      <div className="space-y-8 px-5 py-6 sm:px-8">
        {/* Live-stream banner */}
        <div className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand">
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-brand" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <div>
              <p className="font-semibold">You&apos;re live — “Warzone ranked grind”</p>
              <p className="text-sm text-fog">Winz is capturing. Clips will be ready minutes after you end.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="pill"><IconClock className="h-3.5 w-3.5" /> 3h 04m</span>
            <span className="pill">12 moments detected</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Clips this week" value={String(stats.clipsThisWeek)} hint="across 3 platforms" />
          <StatCard label="Views this week" value="512.4K" delta={`+${stats.viewsDeltaPct}%`} spark={stats.spark} />
          <StatCard label="Profile clicks" value="4,120" hint="→ your Kick channel" />
          <StatCard label="New followers" value="1,340" delta="+18%" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Review CTA + recent posts */}
          <div className="space-y-6">
            <div className="card flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand">
                  <IconInbox className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{reviewCount} clips waiting for review</p>
                  <p className="text-sm text-fog">Approve them and Winz posts on schedule.</p>
                </div>
              </div>
              <Link href="/dashboard/review" className="btn-primary">
                Review <IconArrow className="h-4 w-4" />
              </Link>
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">Recently posted</h3>
                <Link href="/dashboard/clips" className="text-sm text-fog hover:text-chalk">View all</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {recentPosted.map((c) => (
                  <div key={c.id}>
                    <ClipThumb tint={c.thumbTint} duration={c.durationSec} score={c.score} />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      {c.assignedTo && <PlatformBadge platform={c.assignedTo} />}
                      <span className="text-fog">{c.views ? `${(c.views / 1000).toFixed(0)}K` : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent streams */}
          <div className="card p-5">
            <h3 className="mb-4 font-bold">Recent streams</h3>
            <div className="space-y-1">
              {streams.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-ink-850">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-fog">{s.date} · {Math.floor(s.durationMin / 60)}h {s.durationMin % 60}m</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-semibold text-brand">{s.moments}</p>
                      <p className="text-[10px] uppercase tracking-wide text-fog">moments</p>
                    </div>
                    <div className="w-12">
                      <p className="inline-flex items-center gap-1 text-sm font-semibold">
                        <IconCheck className="h-3.5 w-3.5 text-brand" />{s.posted}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-fog">posted</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
