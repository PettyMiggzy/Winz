import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell, Field } from "@/components/marketing/AuthShell";
import { PlatformBadge } from "@/components/PlatformBadge";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <form className="mt-8 space-y-4">
        <button type="button" className="btn-ghost w-full py-3">
          <PlatformBadge platform="kick" /> Continue with Kick
        </button>
        <div className="flex items-center gap-3 text-xs text-fog">
          <span className="hairline flex-1" /> or <span className="hairline flex-1" />
        </div>
        <Field label="Email" type="email" placeholder="you@email.com" />
        <Field label="Password" type="password" placeholder="Your password" />
        <Link href="/dashboard" className="btn-primary w-full py-3">
          Sign in <IconArrow className="h-4 w-4" />
        </Link>
      </form>
    </AuthShell>
  );
}
