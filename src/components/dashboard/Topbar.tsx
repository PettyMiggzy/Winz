import { CHANNEL } from "@/lib/mock";
import { PlatformBadge } from "@/components/PlatformBadge";
import { getSessionUser } from "@/server/auth";
import { hasDatabase } from "@/server/db";

const PLAN_LABEL: Record<string, string> = {
  ADMIN: "Founder",
  PRO: "Pro",
  FREE: "Free beta",
};

export async function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const user = hasDatabase ? await getSessionUser() : null;
  // Session workspace when signed in; seed channel only in demo mode.
  const kickSlug = user ? user.kickSlug : CHANNEL.kickUrl.replace(/^kick\.com\//i, "");
  const workspace = user?.tenantName ?? "Demo";
  const initial = (user?.name || user?.email || "W").charAt(0).toUpperCase();

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-fog">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {kickSlug && (
            <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-sm sm:inline-flex">
              <PlatformBadge platform="kick" />
              <span className="font-medium text-chalk">kick.com/{kickSlug}</span>
            </span>
          )}
          <span className="hidden items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-sm md:inline-flex">
            <span className="font-medium text-chalk">{workspace}</span>
            {user && (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">
                {PLAN_LABEL[user.plan] ?? user.plan}
              </span>
            )}
          </span>
          {user ? (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-magenta text-sm font-bold text-ink-950"
                title={`Sign out (${user.email})`}
              >
                {initial}
              </button>
            </form>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-magenta text-sm font-bold text-ink-950">
              W
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
