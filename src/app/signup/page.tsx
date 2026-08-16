import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/marketing/AuthShell";
import { AuthForm } from "@/components/marketing/AuthForm";
import { hasDatabase } from "@/server/db";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = { title: "Start free" };

export default function SignupPage() {
  if (!hasDatabase) {
    return (
      <AuthShell mode="signup">
        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-fog">
            <span className="font-semibold text-brand">Demo mode.</span> This deployment
            has no database — explore the dashboard with example data.
          </div>
          <Link href="/dashboard" className="btn-primary w-full py-3">
            Enter the demo <IconArrow className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell mode="signup">
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-xs text-fog">
        By continuing you agree to our{" "}
        <Link href="/terms" className="text-chalk hover:text-brand">Terms</Link> and{" "}
        <Link href="/privacy" className="text-chalk hover:text-brand">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
