import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { ClipThumb } from "@/components/dashboard/ClipThumb";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconHeart, IconEye, IconMusicOff } from "@/components/Icons";
import { type ClipStatus } from "@/lib/mock";
import { getClips } from "@/server/store";
import { languageLabel } from "@/lib/languages";

const STATUS_STYLE: Record<ClipStatus, string> = {
  review: "bg-brand/15 text-brand",
  scheduled: "bg-violet/15 text-violet",
  posted: "bg-ink-700 text-fog",
  skipped: "bg-ink-700 text-fog",
};

const FILTERS: { label: string; value: string; status?: ClipStatus }[] = [
  { label: "All", value: "all" },
  { label: "Posted", value: "posted", status: "posted" },
  { label: "Scheduled", value: "scheduled", status: "scheduled" },
  { label: "In review", value: "review", status: "review" },
  { label: "Skipped", value: "skipped", status: "skipped" },
];

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [all, sp] = await Promise.all([getClips(), searchParams]);
  const active = FILTERS.find((f) => f.value === sp.status) ?? FILTERS[0];
  const clips = active.status ? all.filter((c) => c.status === active.status) : all;
  return (
    <>
      <Topbar title="Clips" subtitle="Every clip WinClipz has cut from your streams." />
      <div className="px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/dashboard/clips" : `/dashboard/clips?status=${f.value}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active.value === f.value ? "border-brand/40 bg-brand/10 text-chalk" : "border-line bg-ink-850 text-fog hover:text-chalk"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {clips.map((c) => (
            <div key={c.id} className="card overflow-hidden p-0">
              <div className="p-2.5">
                {c.videoUrl ? (
                  <video
                    src={c.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[9/16] w-full rounded-lg border border-line bg-ink-950 object-contain"
                  />
                ) : (
                  <ClipThumb tint={c.thumbTint} duration={c.durationSec} score={c.score} />
                )}
              </div>
              <div className="px-3 pb-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</p>
                {c.lang && (
                  <span className="mt-1 inline-block rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-semibold text-violet">
                    {languageLabel(c.lang)}
                  </span>
                )}
                {c.videoUrl && (
                  <a href={c.videoUrl} download target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-medium text-brand hover:underline">
                    Download MP4 ↓
                  </a>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status]}`}>
                    {c.status === "review" ? "in review" : c.status}
                  </span>
                  {c.assignedTo && <PlatformBadge platform={c.assignedTo} />}
                </div>
                {c.status === "posted" && (
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-fog">
                    <span className="inline-flex items-center gap-1"><IconEye className="h-3.5 w-3.5" /> {c.views ? `${(c.views / 1000).toFixed(1)}K` : "—"}</span>
                    <span className="inline-flex items-center gap-1"><IconHeart className="h-3.5 w-3.5" /> {c.likes ? `${(c.likes / 1000).toFixed(1)}K` : "—"}</span>
                  </div>
                )}
                {c.flaggedMusic && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-magenta-soft">
                    {/* Nothing is stripped — the audio is untouched. Say what
                        was actually found. */}
                    <IconMusicOff className="h-3 w-3" />
                    {c.musicTrack ? `contains ${c.musicTrack}` : "copyrighted music"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
