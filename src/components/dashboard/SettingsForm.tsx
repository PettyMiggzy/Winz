"use client";

import { useState } from "react";
import { ClipThumb } from "@/components/dashboard/ClipThumb";

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand" : "bg-ink-700"}`}
    >
      {/* left-0 anchors the knob to the track's left edge — a <button> is
          text-align:center by default, which would otherwise center it. */}
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-fog">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsForm() {
  const [watermark, setWatermark] = useState("kick.com/WinslowBankz");
  const [autoPost, setAutoPost] = useState(false);
  const [musicGate, setMusicGate] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [perDay, setPerDay] = useState(3);
  const [platforms, setPlatforms] = useState({ tiktok: true, youtube: true, instagram: true });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-6">
        {/* Branding */}
        <section className="card p-6">
          <h3 className="font-bold">Branding</h3>
          <p className="mt-1 text-sm text-fog">This appears on every clip, centered where no platform UI covers it.</p>
          <label htmlFor="wm-input" className="mt-4 block text-xs font-medium uppercase tracking-wide text-fog">Watermark text</label>
          <input
            id="wm-input"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand/50"
          />
          <div className="mt-4 hairline pt-2">
            <Row title="Burn in animated captions" desc="Word-by-word karaoke captions from your stream audio.">
              <Toggle label="Burn in animated captions" on={captions} onClick={() => setCaptions((v) => !v)} />
            </Row>
          </div>
        </section>

        {/* Posting */}
        <section className="card p-6">
          <h3 className="font-bold">Posting</h3>
          <div className="mt-2 divide-y divide-line">
            <Row title="Auto-post approved clips" desc="Off = clips wait in your review queue first (recommended at the start).">
              <Toggle label="Auto-post approved clips" on={autoPost} onClick={() => setAutoPost((v) => !v)} />
            </Row>
            <Row title="Music safety net" desc="Scan every clip for claimed music and skip or strip it before posting.">
              <Toggle label="Music safety net" on={musicGate} onClick={() => setMusicGate((v) => !v)} />
            </Row>
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Clips per account per day</p>
                  <p className="text-xs text-fog">Posts are spaced out with human-like jitter.</p>
                </div>
                <span className="rounded-lg bg-ink-800 px-3 py-1 text-sm font-semibold text-brand">{perDay}</span>
              </div>
              <input
                type="range" aria-label="Clips per account per day" min={1} max={6} value={perDay}
                onChange={(e) => setPerDay(Number(e.target.value))}
                className="mt-3 w-full accent-brand"
              />
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="card p-6">
          <h3 className="font-bold">Distribute to</h3>
          <div className="mt-2 divide-y divide-line">
            {(["tiktok", "youtube", "instagram"] as const).map((p) => (
              <Row key={p} title={p === "youtube" ? "YouTube Shorts" : p === "instagram" ? "Instagram Reels" : "TikTok"} desc="Each connected account gets different clips.">
                <Toggle label={`Distribute to ${p}`} on={platforms[p]} onClick={() => setPlatforms((s) => ({ ...s, [p]: !s[p] }))} />
              </Row>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary">Save changes</button>
          <span className="text-xs text-fog">Demo only — changes aren&apos;t persisted yet.</span>
        </div>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-fog">Live preview</p>
          <div className="mx-auto w-40">
            <ClipThumb tint="from-brand/40 via-violet/30 to-magenta/40" duration={24} score={94} />
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-fog">
            <p>Watermark: <span className="text-chalk">{watermark || "—"}</span></p>
            <p>Captions: <span className="text-chalk">{captions ? "on" : "off"}</span></p>
            <p>Music gate: <span className="text-chalk">{musicGate ? "on" : "off"}</span></p>
            <p>Mode: <span className="text-chalk">{autoPost ? "auto-post" : "review first"}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
