import { Topbar } from "@/components/dashboard/Topbar";
import { PlatformBadge } from "@/components/PlatformBadge";
import { getPosts } from "@/server/store";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-violet/15 text-violet",
  posting: "bg-brand/15 text-brand",
  posted: "bg-brand/15 text-brand",
  failed: "bg-magenta/15 text-magenta-soft",
};

export default async function PostsPage() {
  const posts = await getPosts();
  return (
    <>
      <Topbar
        title="Posts"
        subtitle="Every post the machine has sent or queued. Queued clips drip out on each account's own cadence instead of all at once."
      />
      <div className="px-5 py-6 sm:px-8">
        {posts.length === 0 ? (
          <div className="card grid place-items-center py-20 text-center">
            <p className="font-semibold">No posts yet</p>
            <p className="mt-1 max-w-md text-sm text-fog">
              Approve a clip in the review queue and it&apos;ll show up here on its way
              out to your connected accounts.
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fog">
                  <th className="px-4 py-3 font-medium">Clip</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="max-w-[240px] truncate px-4 py-3 font-medium">{p.clipTitle}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <PlatformBadge platform={p.platform} />
                        <span className="text-fog">@{p.accountHandle}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.externalUrl ? (
                        <a
                          href={p.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize hover:underline ${STATUS_STYLE[p.status]}`}
                        >
                          {p.status} ↗
                        </a>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[p.status]}`}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fog">
                      {p.dueAt ? <>goes out {p.dueAt}</> : p.when}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
