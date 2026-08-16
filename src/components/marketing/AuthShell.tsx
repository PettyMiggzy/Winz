import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { ClipPhone } from "@/components/ClipPhone";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconCheck } from "@/components/Icons";

export function AuthShell({
  mode, children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {mode === "signup" ? "Start growing your channel" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-fog">
              {mode === "signup"
                ? "Free during beta — no card required."
                : "Sign in to your WinClipz dashboard."}
            </p>
            {children}
          </div>
        </div>
        <p className="text-center text-xs text-fog">
          {mode === "signup" ? "Already have an account? " : "New to WinClipz? "}
          <Link href={mode === "signup" ? "/login" : "/signup"} className="font-semibold text-brand hover:underline">
            {mode === "signup" ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>

      {/* visual side */}
      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <Image src="/generated/hero.webp" alt="" fill sizes="50vw" className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="ml-auto w-40">
            <ClipPhone caption="down 1v4… THIS" score={94} />
          </div>
          <div>
            <div className="flex gap-3">
              <PlatformBadge platform="tiktok" />
              <PlatformBadge platform="youtube" />
              <PlatformBadge platform="instagram" />
            </div>
            <p className="mt-4 max-w-sm text-lg font-semibold leading-snug">
              Every stream becomes a week of content — posted everywhere,
              automatically.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fog">
              {["Clips live minutes after you end", "Your branding on every post", "Accounts kept safe from music strikes"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-brand" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-fog">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-600 focus:border-brand/50"
      />
    </label>
  );
}
