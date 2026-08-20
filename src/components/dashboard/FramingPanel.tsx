"use client";

import { useState } from "react";

/**
 * Choose how clips are framed vertically. The split layout needs to know where
 * the facecam sits — guessing wrong frames the clip on the wrong thing, so the
 * user marks it with sliders (their cam doesn't move between streams).
 */
type Layout = "crop" | "blurpad" | "split";

const OPTIONS: { value: Layout; title: string; blurb: string }[] = [
  { value: "crop", title: "Centre crop", blurb: "Best for talking, IRL, and single-cam streams." },
  { value: "blurpad", title: "Blurred pad", blurb: "Keeps the whole frame, fills the edges with a blur." },
  { value: "split", title: "Facecam + gameplay", blurb: "Your cam on top, gameplay below — the gaming layout." },
];

export function FramingPanel({
  initialLayout,
  initialFacecam,
}: {
  initialLayout: Layout;
  initialFacecam: { x: number; y: number; w: number; h: number } | null;
}) {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [cam, setCam] = useState(initialFacecam ?? { x: 0.02, y: 0.62, w: 0.26, h: 0.34 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/settings/framing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, facecam: layout === "split" ? cam : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "couldn't save");
      setMsg("Saved — new clips will use this framing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Clip framing</h3>
          <p className="mt-0.5 max-w-lg text-sm text-fog">
            How your widescreen stream becomes a vertical clip.
          </p>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => { setLayout(o.value); setMsg(""); setError(""); }}
            className={`rounded-xl border p-3 text-left transition-colors ${
              layout === o.value ? "border-brand/50 bg-brand/10" : "border-line bg-ink-900 hover:border-line/80"
            }`}
          >
            <span className="block text-sm font-semibold">{o.title}</span>
            <span className="mt-0.5 block text-xs text-fog">{o.blurb}</span>
          </button>
        ))}
      </div>

      {layout === "split" && (
        <div className="mt-4 rounded-xl border border-line bg-ink-900/60 p-4">
          <p className="text-sm font-medium text-chalk">Where is your facecam?</p>
          <p className="mt-0.5 text-xs text-fog">
            Drag the sliders until the box matches your cam&apos;s position on stream.
            It only needs setting once.
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            {/* Live preview of the marked region over a 16:9 frame */}
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-line bg-ink-950 sm:w-64">
              <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-wide text-fog/50">
                your stream
              </div>
              <div
                className="absolute rounded border-2 border-brand bg-brand/20"
                style={{ left: pct(cam.x), top: pct(cam.y), width: pct(cam.w), height: pct(cam.h) }}
              >
                <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-brand">
                  CAM
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {([
                ["From left", "x", cam.x],
                ["From top", "y", cam.y],
                ["Width", "w", cam.w],
                ["Height", "h", cam.h],
              ] as const).map(([label, key, val]) => (
                <label key={key} className="block">
                  <span className="flex items-center justify-between text-xs text-fog">
                    {label} <span className="text-chalk">{pct(val)}</span>
                  </span>
                  <input
                    type="range"
                    min={key === "w" || key === "h" ? 0.05 : 0}
                    max={1}
                    step={0.01}
                    value={val}
                    onChange={(e) => setCam((c) => ({ ...c, [key]: Number(e.target.value) }))}
                    className="mt-1 w-full accent-[#19e57f]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-brand">{msg}</p>}
      {error && <p className="mt-3 text-sm text-magenta-soft">{error}</p>}
    </div>
  );
}
