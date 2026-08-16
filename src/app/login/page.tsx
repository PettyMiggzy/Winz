import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/marketing/AuthShell";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Honest beta state: individual accounts aren't built yet — one shared
 * workspace. No fake email/password fields pretending to authenticate.
 */
export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-fog">
          <span className="font-semibold text-brand">Free beta.</span> Accounts and
          sign-in are coming soon — right now WinClipz runs as a single workspace.
        </div>
        <Link href="/dashboard" className="btn-primary w-full py-3">
          Enter the dashboard <IconArrow className="h-4 w-4" />
        </Link>
      </div>
    </AuthShell>
  );
}
