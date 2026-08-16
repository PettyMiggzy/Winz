import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/marketing/AuthShell";
import { AuthForm } from "@/components/marketing/AuthForm";
import { hasDatabase } from "@/server/db";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!hasDatabase) {
    // Demo deployment — no accounts, straight into the seeded dashboard.
    return (
      <AuthShell mode="login">
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
    <AuthShell mode="login">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
