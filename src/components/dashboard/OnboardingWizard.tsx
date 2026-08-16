"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconCheck, IconArrow, IconClock, IconLink } from "@/components/Icons";
import { WARMUP_STEPS } from "@/lib/ramp";

const KIT = [
  { platform: "tiktok" as const, handle: "@winslowbankz", role: "main", note: "your primary — best clips" },
  { platform: "tiktok" as const, handle: "@winslowclips", role: "clips", note: "different clips, own hooks" },
  { platform: "instagram" as const, handle: "@winslowbankz", role: "main", note: "Professional account" },
  { platform: "instagram" as const, handle: "@winslow.clips", role: "clips", note: "different clips" },
  { platform: "youtube" as const, handle: "WinslowBankz", role: "main", note: "Shorts + long-form 'best of'" },
];
const BIO = "🎮 twitch of kick · new clips daily 🔥  ▶ Kick.com/WinslowBankz";

const STEPS = [
  { key: "plan", title: "Plan your accounts", time: "2 min" },
  { key: "create", title: "Create them safely", time: "on your phone" },
  { key: "warmup", title: "Warm them up", time: "~1 week" },
  { key: "connect", title: "Connect & go hands-free", time: "2 min" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<boolean[]>([false, false, false, false]);

  const markDone = (i: number) => setDone((d) => d.map((v, idx) => (idx === i ? true : v)));

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Step rail */}
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {STEPS.map((s, i) => {
          const active = i === step;
          return (
            <li key={s.key}>
              <button
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-ink-800" : "hover:bg-ink-850"}`}
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done[i] ? "bg-brand text-ink-950" : active ? "border border-brand/50 text-brand" : "border border-line text-fog"}`}>
                  {done[i] ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-medium ${active ? "text-chalk" : "text-fog"}`}>{s.title}</span>
                  <span className="block text-[11px] text-fog">{s.time}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Panel */}
      <div className="card p-6 sm:p-8">
        {step === 0 && (
          <Panel title="Plan your accounts" intro="Each account gets DIFFERENT clips — that's what keeps reach healthy. A 'main' account plus a 'clips' account per platform is the sweet spot. Here's a starter kit for your channel:">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fog">
                    <th className="pb-2 font-medium">Platform</th>
                    <th className="pb-2 font-medium">Handle</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {KIT.map((k) => (
                    <tr key={k.platform + k.handle}>
                      <td className="py-2.5"><PlatformBadge platform={k.platform} showLabel /></td>
                      <td className="py-2.5 font-medium">{k.handle}</td>
                      <td className="py-2.5"><span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-fog">{k.role}</span></td>
                      <td className="py-2.5 text-fog">{k.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Callout tone="brand">
              <strong className="text-chalk">YouTube stays at 1–2 channels</strong> on purpose — splitting Shorts
              views across many channels hurts monetization. Put your long-form
              &ldquo;best of&rdquo; videos on the main one.
            </Callout>
            <div className="rounded-xl border border-line bg-ink-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">Suggested bio (paste into each)</p>
              <p className="mt-2 rounded-lg bg-ink-950/60 px-3 py-2 font-mono text-sm text-chalk">{BIO}</p>
              <p className="mt-2 text-xs text-fog">Want matching profile pictures? Ask and I&apos;ll generate a set.</p>
            </div>
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Create them safely — on your phone" intro="This is the one part that has to be done by hand. Automated or bulk-created accounts get flagged and banned. Do it from your phone and it's completely fine.">
            <Rules items={[
              "Use your phone on home wifi — not a VPN, not a laptop, not a server.",
              "Create ONE account every 2–3 days. Never batch several the same day.",
              "Give each its own email and complete phone verification.",
              "Switch TikTok & Instagram to a Professional / Business account (required for auto-posting).",
              "Set the profile picture, the bio from step 1, and your Kick link.",
            ]} />
            <Callout tone="magenta">
              <strong className="text-chalk">Don&apos;t</strong> buy aged accounts or use proxy / anti-detect
              browsers. That&apos;s what turns a legit setup into a bannable one.
            </Callout>
          </Panel>
        )}

        {step === 2 && (
          <Panel title="Warm them up (~1 week)" intro="New accounts should look human before automation touches them. Spend a few minutes on each over about a week:">
            <Rules items={[
              "Post 3–5 clips manually on each new account.",
              "Scroll the feed, like and follow a handful of real accounts.",
              "Reply to a comment or two — normal activity.",
              "After ~1 week of this, the account is ready to connect.",
            ]} />
            <Callout tone="brand">
              Once connected, Winz keeps warming automatically — it starts slow and
              speeds up over two weeks (next step), so you don&apos;t have to think about it.
            </Callout>
          </Panel>
        )}

        {step === 3 && (
          <Panel title="Connect & go hands-free" intro="Connect each warmed account with its official login. Winz never sees or stores your password — just an access token you can revoke anytime.">
            <div className="rounded-xl border border-line bg-ink-900/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><IconClock className="h-4 w-4 text-brand" /> How Winz ramps posting</p>
              <ul className="mt-3 space-y-2">
                {WARMUP_STEPS.map((w) => (
                  <li key={w.day} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-xs font-semibold text-brand">{w.day}</span>
                    <span className="text-fog">{w.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/api/auth/kick/start" className="btn-primary"><PlatformBadge platform="kick" /> Connect Kick</Link>
              <button className="btn-ghost"><PlatformBadge platform="tiktok" /> Connect TikTok</button>
              <button className="btn-ghost"><PlatformBadge platform="youtube" /> Connect YouTube</button>
              <button className="btn-ghost"><PlatformBadge platform="instagram" /> Connect Instagram</button>
            </div>
            <p className="text-xs text-fog">Then just go live — Winz clips, brands, and posts on the ramp above.</p>
          </Panel>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-dim disabled:opacity-30">
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => { markDone(step); setStep((s) => s + 1); }} className="btn-primary">
              Mark done · next <IconArrow className="h-4 w-4" />
            </button>
          ) : (
            <Link href="/dashboard/accounts" onClick={() => markDone(step)} className="btn-primary">
              Finish <IconCheck className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fog">{intro}</p>
      </div>
      {children}
    </div>
  );
}

function Rules({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
            <IconCheck className="h-3 w-3" />
          </span>
          <span className="text-chalk/90">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ tone, children }: { tone: "brand" | "magenta"; children: React.ReactNode }) {
  const c = tone === "brand" ? "border-brand/30 bg-brand/5" : "border-magenta/30 bg-magenta/5";
  return <div className={`rounded-xl border ${c} px-4 py-3 text-sm text-fog`}>{children}</div>;
}
