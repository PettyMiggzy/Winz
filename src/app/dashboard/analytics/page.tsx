import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { PlatformBadge, platformLabel } from "@/components/PlatformBadge";
import { type Platform, formatCount } from "@/lib/mock";
import { getClips, getStats } from "@/server/store";

const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export default async function AnalyticsPage() {
  const [clips, stats] = await Promise.all([getClips(), getStats()]);
  const posted = clips.filter((c) => c.status === "posted");
  // Derive headline numbers from the actual posted clips so they can't diverge
  // from the table below (in seed OR DB mode).
  const totalViews = posted.reduce((s, c) => s + (c.views ?? 0), 0);
  const avgViews = posted.length ? totalViews / posted.length : 0;
  const top = [...posted].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

  const perPlatform = PLATFORMS.map((p) => {
    const list = posted.filter((c) => c.assignedTo === p);
    const views = list.reduce((s, c) => s + (c.views ?? 0), 0);
    return { p, count: list.length, views };
  });
  const maxViews = Math.max(...perPlatform.map((x) => x.views), 1);

  return (
    <>
      <Topbar title="Analytics" subtitle="What's working — and what Winz should clip more of." />
      <div className="space-y-8 px-5 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total views" value={formatCount(totalViews)} delta="+34%" spark={stats.spark} />
          <StatCard label="Avg. views / clip" value={formatCount(avgViews)} hint="posted clips" />
          <StatCard label="Profile clicks" value={stats.profileClicks.toLocaleString()} delta="+21%" />
          <StatCard label="Follows from clips" value={stats.newFollowers.toLocaleString()} hint="→ Kick + socials" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-5 font-bold">Views by platform</h3>
            <div className="space-y-4">
              {perPlatform.map(({ p, views, count }) => (
                <div key={p}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <PlatformBadge platform={p} /> {platformLabel(p)}
                    </span>
                    <span className="text-fog">{(views / 1000).toFixed(1)}K · {count} clips</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-magenta"
                      style={{ width: `${(views / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-5 font-bold">What Winz learned this week</h3>
            <ul className="space-y-3 text-sm">
              <Insight tint="text-brand" text="Chat-spike clips outperformed audio-only clips by 2.3× views. Winz is weighting chat velocity higher." />
              <Insight tint="text-magenta-soft" text="Clips under 22s held ~18% more watch time. Cutting tighter by default." />
              <Insight tint="text-violet" text="Hooks phrased as a question drove more profile clicks. Prioritizing question hooks." />
            </ul>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-bold">Top clips</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fog">
                  <th className="pb-3 font-medium">Clip</th>
                  <th className="pb-3 font-medium">Platform</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 text-right font-medium">Views</th>
                  <th className="pb-3 text-right font-medium">Likes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-ink-850">
                    <td className="py-3 pr-4">
                      <p className="max-w-xs truncate font-medium">{c.title}</p>
                      <p className="text-xs text-fog">{c.signal}</p>
                    </td>
                    <td className="py-3">{c.assignedTo && <PlatformBadge platform={c.assignedTo} showLabel />}</td>
                    <td className="py-3"><span className="font-semibold text-brand">{c.score}</span></td>
                    <td className="py-3 text-right font-medium">{c.views ? `${(c.views / 1000).toFixed(1)}K` : "—"}</td>
                    <td className="py-3 text-right text-fog">{c.likes ? `${(c.likes / 1000).toFixed(1)}K` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Insight({ text, tint }: { text: string; tint: string }) {
  return (
    <li className="flex gap-2.5">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${tint}`} />
      <span className="text-chalk/90">{text}</span>
    </li>
  );
}
