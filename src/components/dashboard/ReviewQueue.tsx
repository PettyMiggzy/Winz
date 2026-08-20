"use client";

import { useState } from "react";
import type { Clip, Platform } from "@/lib/mock";
import { ClipThumb } from "@/components/dashboard/ClipThumb";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconCheck, IconBolt, IconMusicOff } from "@/components/Icons";
import { TikTokApproveDialog, type TikTokPostOptions } from "@/components/dashboard/TikTokApproveDialog";
import { languageLabel } from "@/lib/languages";

type Decision = "pending" | "approved" | "skipped";
const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export function ReviewQueue({
  initial,
  tiktokHandles = [],
}: {
  initial: Clip[];
  /** Connected TikTok handles this workspace will post to (fanout target). */
  tiktokHandles?: string[];
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(initial.map((c) => [c.id, "pending"]))
  );
  const [assign, setAssign] = useState<Record<string, Platform>>(
    Object.fromEntries(initial.map((c) => [c.id, c.assignedTo ?? "tiktok"]))
  );

  const pending = initial.filter((c) => decisions[c.id] === "pending");
  const approved = initial.filter((c) => decisions[c.id] === "approved").length;

  const [failed, setFailed] = useState<Record<string, boolean>>({});
  // Clip awaiting TikTok-specific consent (privacy level etc.) before approval.
  const [tiktokDialog, setTiktokDialog] = useState<Clip | null>(null);
  const [noTikTok, setNoTikTok] = useState(false);

  const persist = async (id: string, d: Decision, tiktokOptions?: TikTokPostOptions) => {
    if (d === "pending") return;
    try {
      const res = await fetch(`/api/clips/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: d === "approved" ? "approve" : "skip",
          platform: assign[id],
          ...(tiktokOptions ? { tiktokOptions } : {}),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Roll the clip back into the queue and flag it so the user can retry.
      setDecisions((prev) => ({ ...prev, [id]: "pending" }));
      setFailed((prev) => ({ ...prev, [id]: true }));
    }
  };

  const set = (id: string, d: Decision, tiktokOptions?: TikTokPostOptions) => {
    setFailed((prev) => ({ ...prev, [id]: false }));
    // TikTok approvals need explicit per-post consent (privacy dropdown, no
    // default) — open the dialog instead of approving straight away.
    if (d === "approved" && assign[id] === "tiktok" && !tiktokOptions) {
      if (tiktokHandles.length === 0) {
        setFailed((prev) => ({ ...prev, [id]: true }));
        setNoTikTok(true);
        return;
      }
      const clip = initial.find((c) => c.id === id);
      if (clip) setTiktokDialog(clip);
      return;
    }
    setDecisions((prev) => ({ ...prev, [id]: d }));
    void persist(id, d, tiktokOptions);
  };

  return (
    <div>
      {tiktokDialog && (
        <TikTokApproveDialog
          clipTitle={tiktokDialog.title}
          accountHandles={tiktokHandles}
          onConfirm={(opts) => {
            const id = tiktokDialog.id;
            setTiktokDialog(null);
            setDecisions((prev) => ({ ...prev, [id]: "approved" }));
            void persist(id, "approved", opts);
          }}
          onCancel={() => setTiktokDialog(null)}
        />
      )}
      {noTikTok && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-magenta/30 bg-magenta/5 px-4 py-3 text-sm text-magenta-soft">
          <span>No TikTok account connected yet — connect one to post there.</span>
          <a href="/dashboard/accounts" className="font-semibold underline">Connect TikTok</a>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="pill">
          <IconBolt className="h-3.5 w-3.5 text-brand" /> {pending.length} awaiting review
        </div>
        <div className="pill">
          <IconCheck className="h-3.5 w-3.5 text-brand" /> {approved} approved to post
        </div>
        <button
          onClick={() => {
            // TikTok clips need per-post consent (privacy dialog) — bulk
            // approval covers the rest and leaves TikTok ones pending.
            const toApprove = initial.filter(
              (c) => decisions[c.id] === "pending" && assign[c.id] !== "tiktok"
            );
            setFailed((prev) => {
              const next = { ...prev };
              for (const c of toApprove) next[c.id] = false;
              return next;
            });
            setDecisions((prev) => {
              const next = { ...prev };
              for (const c of toApprove) next[c.id] = "approved";
              return next;
            });
            for (const c of toApprove) void persist(c.id, "approved");
          }}
          className="btn-primary ml-auto"
        >
          Approve all
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="card grid place-items-center py-20 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <IconCheck className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold">Queue cleared</p>
          <p className="mt-1 text-sm text-fog">{approved} clips are scheduled to post. Nice.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((c) => (
            <div key={c.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className={`shrink-0 ${c.videoUrl ? "w-36 sm:w-40" : "w-20"}`}>
                {c.videoUrl ? (
                  // Real rendered clip — watch it right here before approving.
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

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">🔥 {c.score}</span>
                  {c.lang && (
                    <span className="rounded-full bg-violet/15 px-2 py-0.5 text-xs font-semibold text-violet">
                      {languageLabel(c.lang)}
                    </span>
                  )}
                  <span className="text-xs text-fog">{c.signal}</span>
                  {c.flaggedMusic && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-magenta/15 px-2 py-0.5 text-xs font-semibold text-magenta-soft">
                      <IconMusicOff className="h-3 w-3" /> music flagged
                    </span>
                  )}
                </div>
                <h3 className="mt-2 truncate font-bold">{c.title}</h3>
                <p className="truncate text-sm text-fog">Hook: “{c.hook}” · {c.stream} · {c.createdAt}</p>
                {c.videoUrl && (
                  <a
                    href={c.videoUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
                  >
                    Download MP4 ↓
                  </a>
                )}

                <div className="mt-3 flex items-center gap-1.5">
                  <span className="mr-1 text-xs text-fog">Post to:</span>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAssign((prev) => ({ ...prev, [c.id]: p }))}
                      aria-pressed={assign[c.id] === p}
                      aria-label={`Post to ${p}`}
                      className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
                        assign[c.id] === p
                          ? "border-brand/50 bg-brand/10"
                          : "border-line bg-ink-800 hover:border-line/80"
                      }`}
                      title={p}
                    >
                      <PlatformBadge platform={p} />
                    </button>
                  ))}
                </div>
                {failed[c.id] && (
                  <p className="mt-2 text-xs text-magenta-soft">Couldn&apos;t save — try again.</p>
                )}
              </div>

              <div className="flex shrink-0 gap-2 sm:flex-col">
                <button onClick={() => set(c.id, "approved")} className="btn-primary flex-1 sm:w-32">
                  <IconCheck className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => set(c.id, "skipped")} className="btn-ghost flex-1 sm:w-32">
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
