import { Topbar } from "@/components/dashboard/Topbar";
import { PlatformBadge, platformLabel } from "@/components/PlatformBadge";
import { IconCheck, IconLink } from "@/components/Icons";
import { accounts, type Platform } from "@/lib/mock";

const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export default function AccountsPage() {
  return (
    <>
      <Topbar
        title="Accounts"
        subtitle="Connect the accounts Winz posts to. Different clips go to each — never the same clip twice."
      />
      <div className="space-y-8 px-5 py-6 sm:px-8">
        <div className="card flex items-start gap-3 p-4">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
            <IconCheck className="h-4 w-4" />
          </span>
          <p className="text-sm text-fog">
            <span className="font-semibold text-chalk">Why a &ldquo;main&rdquo; and a &ldquo;clips&rdquo; account?</span>{" "}
            Platforms bury the same video posted twice, so Winz gives each account
            different clips. Two accounts per platform is the sweet spot for reach
            without tripping duplicate-content filters.
          </p>
        </div>

        {PLATFORMS.map((p) => {
          const list = accounts.filter((a) => a.platform === p);
          return (
            <div key={p}>
              <div className="mb-3 flex items-center gap-2">
                <PlatformBadge platform={p} />
                <h2 className="font-bold">{platformLabel(p)}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((a) => (
                  <div key={a.id} className="card flex items-center justify-between p-5">
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
                            {a.followers?.toLocaleString()} followers · {a.postsThisWeek} posts this week
                          </p>
                        ) : (
                          <p className="text-xs text-fog">Not connected</p>
                        )}
                      </div>
                    </div>
                    {a.connected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected
                      </span>
                    ) : (
                      <button className="btn-ghost text-sm">
                        <IconLink className="h-4 w-4" /> Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-fog">
          Connecting uses each platform&apos;s official login. Winz never sees or
          stores your password, and you can disconnect any account at any time.
        </p>
      </div>
    </>
  );
}
