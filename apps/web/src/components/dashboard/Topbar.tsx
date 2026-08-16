import Link from "next/link";
import { CHANNEL } from "@/lib/mock";
import { PlatformBadge } from "@/components/PlatformBadge";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-fog">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-sm sm:inline-flex">
            <PlatformBadge platform="kick" />
            <span className="font-medium text-chalk">{CHANNEL.kickUrl}</span>
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px] shadow-brand" /> live
            </span>
          </span>
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-magenta text-sm font-bold text-ink-950" title="Account">
            W
          </Link>
        </div>
      </div>
    </div>
  );
}
