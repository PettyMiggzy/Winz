"use client";

import { useState } from "react";
import type { Clip, Platform } from "@/lib/mock";
import { ClipThumb } from "@/components/dashboard/ClipThumb";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconCheck, IconBolt, IconMusicOff } from "@/components/Icons";

type Decision = "pending" | "approved" | "skipped";
const PLATFORMS: Platform[] = ["tiktok", "youtube", "instagram"];

export function ReviewQueue({ initial }: { initial: Clip[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(initial.map((c) => [c.id, "pending"]))
  );
  const [assign, setAssign] = useState<Record<string, Platform>>(
    Object.fromEntries(initial.map((c) => [c.id, c.assignedTo ?? "tiktok"]))
  );

  const pending = initial.filter((c) => decisions[c.id] === "pending");
  const approved = initial.filter((c) => decisions[c.id] === "approved").length;

  const set = (id: string, d: Decision) =>
    setDecisions((prev) => ({ ...prev, [id]: d }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="pill">
          <IconBolt className="h-3.5 w-3.5 text-brand" /> {pending.length} awaiting review
        </div>
        <div className="pill">
          <IconCheck className="h-3.5 w-3.5 text-brand" /> {approved} approved to post
        </div>
        <button
          onClick={() => setDecisions((prev) => {
            const next = { ...prev };
            for (const c of initial) if (next[c.id] === "pending") next[c.id] = "approved";
            return next;
          })}
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
              <div className="w-20 shrink-0">
                <ClipThumb tint={c.thumbTint} duration={c.durationSec} score={c.score} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">🔥 {c.score}</span>
                  <span className="text-xs text-fog">{c.signal}</span>
                  {c.flaggedMusic && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-magenta/15 px-2 py-0.5 text-xs font-semibold text-magenta-soft">
                      <IconMusicOff className="h-3 w-3" /> music flagged
                    </span>
                  )}
                </div>
                <h3 className="mt-2 truncate font-bold">{c.title}</h3>
                <p className="truncate text-sm text-fog">Hook: “{c.hook}” · {c.stream} · {c.createdAt}</p>

                <div className="mt-3 flex items-center gap-1.5">
                  <span className="mr-1 text-xs text-fog">Post to:</span>
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAssign((prev) => ({ ...prev, [c.id]: p }))}
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
