"use client";

import { useState } from "react";
import { DUB_LANGUAGES } from "@/lib/languages";

/**
 * Pick the languages approved clips get auto-dubbed into. Dubbing keeps the
 * creator's own voice, so each translation is genuinely new content — not a
 * reposted duplicate.
 */
export function DubbingPanel({
  initial,
  cap,
  planLabel,
}: {
  initial: string[];
  cap: number; // 0 = not on this plan
  planLabel: string;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const toggle = (code: string) => {
    setMsg("");
    setError("");
    setSelected((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length >= cap
          ? prev
          : [...prev, code]
    );
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/settings/dubbing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "couldn't save");
      setMsg(
        selected.length === 0
          ? "Dubbing off — clips stay in their original language."
          : `Saved. Approved clips will also be created in ${selected.length} language${selected.length === 1 ? "" : "s"}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Translate clips (same voice)</h3>
          <p className="mt-0.5 max-w-lg text-sm text-fog">
            Approve a clip and WinClipz also creates it in these languages —
            speaking in <span className="text-chalk">your own voice</span>. Each
            translation lands in the review queue as its own clip, so you can post
            it to a different account.
          </p>
        </div>
        {cap > 0 && (
          <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {cap === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-ink-850/60 px-4 py-3 text-sm text-fog">
          Translation isn&apos;t included on <span className="text-chalk">{planLabel}</span> yet —
          it has a real per-minute cost. It unlocks on paid plans.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(DUB_LANGUAGES).map(([code, label]) => {
              const on = selected.includes(code);
              const full = !on && selected.length >= cap;
              return (
                <button
                  key={code}
                  onClick={() => toggle(code)}
                  disabled={full}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    on
                      ? "border-brand/50 bg-brand/15 text-brand"
                      : full
                        ? "cursor-not-allowed border-line bg-ink-900 text-fog/40"
                        : "border-line bg-ink-850 text-fog hover:text-chalk"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-fog">
            {selected.length}/{cap} languages selected on your plan.
          </p>
          {msg && <p className="mt-2 text-sm text-brand">{msg}</p>}
          {error && <p className="mt-2 text-sm text-magenta-soft">{error}</p>}
        </>
      )}
    </div>
  );
}
