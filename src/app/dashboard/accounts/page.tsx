import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { PlatformBadge, platformLabel } from "@/components/PlatformBadge";
import { IconCheck, IconLink, IconArrow, IconClock } from "@/components/Icons";
import { type Platform, type Account } from "@/lib/mock";
import { getAccounts } from "@/server/store";
import { getPrisma, hasDatabase } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { rampCapForDay, warmupPercent } from "@/lib/ramp";

const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];
// Slot caps for the current plan (Pro). YouTube is capped lower on purpose —
// splitting Shorts views across channels hurts monetization.
const SLOT_CAP: Record<Platform, number> = { tiktok: 4, youtube: 2, instagram: 4 };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; provider?: string }>;
}) {
  const [accounts, sp] = await Promise.all([getAccounts(), searchParams]);
  const kick = await getKickConnection();
  return (
    <>
      <Topbar
        title="Accounts"
        subtitle="Connect the accounts WinClipz posts to. Approved clips post to each on a staggered schedule so nothing goes out simultaneously."
      />
      <div className="space-y-8 px-5 py-6 sm:px-8">
        {sp.connected && (
          <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">
            <IconCheck className="mr-1.5 inline h-4 w-4" /> Connected {sp.connected} — it&apos;ll start warming up automatically.
          </div>
        )}
        {sp.error && (
          <div className="rounded-xl border border-magenta/30 bg-magenta/5 px-4 py-3 text-sm text-magenta-soft">
            Couldn&apos;t connect {sp.provider ?? "the account"}
            {sp.error === "not_configured" ? " — that platform isn't wired up yet." : ` (${sp.error}).`}
          </div>
        )}
        {/* Kick auto-clip — the zero-touch pipeline */}
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">
              <PlatformBadge platform="kick" />
            </span>
            <div>
              <p className="font-semibold">
                {kick?.connected
                  ? `Auto-clipping ${kick.handle}`
                  : "Auto-clip every stream"}
              </p>
              <p className="mt-0.5 max-w-2xl text-sm text-fog">
                {kick?.connected
                  ? "When your stream ends, WinClipz grabs the VOD and has clips waiting in your review queue. Nothing to paste."
                  : "Connect your Kick channel and WinClipz clips every stream automatically the moment it ends — you wake up to a full review queue."}
              </p>
            </div>
          </div>
          {kick?.connected ? (
            <span className="pill shrink-0">
              <IconCheck className="h-3.5 w-3.5 text-brand" /> connected
            </span>
          ) : (
            <a href="/api/auth/kick/start" className="btn-primary shrink-0">
              Connect Kick <IconArrow className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Setup CTA */}
        <div className="card flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
              <IconCheck className="h-4.5 w-4.5" />
            </span>
            <p className="max-w-2xl text-sm text-fog">
              <span className="font-semibold text-chalk">New accounts need a safe setup.</span>{" "}
              Create them on your phone (home wifi, spaced out), warm them up, then
              connect. WinClipz then ramps posting slowly so nothing gets flagged.
            </p>
          </div>
          <Link href="/dashboard/onboarding" className="btn-primary shrink-0">
            Account setup guide <IconArrow className="h-4 w-4" />
          </Link>
        </div>

        {PLATFORMS.map((p) => {
          const list = accounts.filter((a) => a.platform === p);
          const used = list.filter((a) => a.connected).length;
          return (
            <div key={p}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={p} />
                  <h2 className="font-bold">{platformLabel(p)}</h2>
                </div>
                <span className="pill">
                  {used} of {SLOT_CAP[p]} slots
                  {p === "youtube" && <span className="ml-1 text-brand">· capped for monetization</span>}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((a) => (
                  <AccountCard key={a.id} account={a} platform={p} />
                ))}
                {used < SLOT_CAP[p] && list.length < SLOT_CAP[p] && (
                  <Link
                    href="/dashboard/onboarding"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-5 text-sm text-fog transition-colors hover:border-brand/40 hover:text-chalk"
                  >
                    <IconLink className="h-4 w-4" /> Add another {platformLabel(p)} account
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-fog">
          Connecting uses each platform&apos;s official login. WinClipz never sees or
          stores your password, and you can disconnect any account at any time.
        </p>
      </div>
    </>
  );
}

function AccountCard({ account: a, platform: p }: { account: Account; platform: Platform }) {
  const day = a.warmupDay ?? 0;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${a.connected ? "bg-ink-800 text-chalk" : "border border-dashed border-line text-fog"}`}>
            <PlatformBadge platform={p} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{a.handle}</p>
              <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fog">
                {a.role}
              </span>
            </div>
            {a.connected ? (
              <p className="text-xs text-fog">
                {a.followers != null ? `${a.followers.toLocaleString()} followers` : "Connected"}
                {a.postsThisWeek != null ? ` · ${a.postsThisWeek} posts this week` : ""}
              </p>
            ) : (
              <p className="text-xs text-fog">Not connected</p>
            )}
          </div>
        </div>
        <WarmupStatus state={a.warmupState} connected={a.connected} platform={p} />
      </div>

      {a.warmupState === "warming" && (
        <div className="mt-4 rounded-xl border border-line bg-ink-900/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-violet">
              <IconClock className="h-3.5 w-3.5" /> Warming up · day {day}/14
            </span>
            <span className="text-fog">{rampCapForDay(day)} auto-posts/day</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-gradient-to-r from-violet to-brand" style={{ width: `${warmupPercent(day)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function WarmupStatus({ state, connected, platform }: { state: Account["warmupState"]; connected: boolean; platform: Platform }) {
  if (!connected) {
    // TikTok/Instagram go through OAuth; YouTube (Google) + others route to setup.
    const href = platform === "tiktok" || platform === "instagram" ? `/api/auth/${platform}/start` : "/dashboard/onboarding";
    return (
      <a href={href} className="btn-ghost text-sm">
        <IconLink className="h-4 w-4" /> Connect
      </a>
    );
  }
  if (state === "warming") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet/15 px-3 py-1 text-xs font-semibold text-violet">
        <span className="h-1.5 w-1.5 rounded-full bg-violet" /> Warming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Live
    </span>
  );
}

/** The workspace's connected Kick channel, if any. */
async function getKickConnection(): Promise<{ connected: boolean; handle: string } | null> {
  if (!hasDatabase) return null;
  const user = await getSessionUser();
  const prisma = getPrisma();
  if (!user || !prisma) return null;
  const acct = await prisma.socialAccount.findFirst({
    where: { tenantId: user.tenantId, platform: "KICK" },
    select: { connected: true, handle: true },
  });
  return acct ? { connected: acct.connected, handle: acct.handle } : null;
}
