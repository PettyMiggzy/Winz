import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/marketing/AuthShell";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = { title: "Start free" };

/**
 * Honest beta state: no fake signup form. One shared workspace until real
 * accounts land.
 */
export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-fog">
          <span className="font-semibold text-brand">Free beta.</span> Individual
          accounts are coming soon — for now, jump straight into the workspace and
          start clipping.
        </div>
        <Link href="/dashboard" className="btn-primary w-full py-3">
          Try the beta <IconArrow className="h-4 w-4" />
        </Link>
        <p className="text-center text-xs text-fog">
          By continuing you agree to our{" "}
          <Link href="/terms" className="text-chalk hover:text-brand">Terms</Link> and{" "}
          <Link href="/privacy" className="text-chalk hover:text-brand">Privacy Policy</Link>.
        </p>
      </div>
    </AuthShell>
  );
}
