"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  IconGrid, IconInbox, IconScissors, IconLink, IconChart, IconSettings, IconBolt, IconCheck,
} from "@/components/Icons";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: IconGrid, exact: true },
  { href: "/dashboard/upload", label: "Upload", Icon: IconBolt },
  { href: "/dashboard/review", label: "Review queue", Icon: IconInbox },
  { href: "/dashboard/clips", label: "Clips", Icon: IconScissors },
  { href: "/dashboard/accounts", label: "Accounts", Icon: IconLink },
  { href: "/dashboard/onboarding", label: "Account setup", Icon: IconCheck },
  { href: "/dashboard/analytics", label: "Analytics", Icon: IconChart },
  { href: "/dashboard/settings", label: "Settings", Icon: IconSettings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-ink-900/60 px-4 py-5 lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV.map((n) => {
          const active = n.exact ? path === n.href : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-ink-800 text-chalk"
                  : "text-fog hover:bg-ink-850 hover:text-chalk"
              }`}
            >
              <n.Icon className={`h-[18px] w-[18px] ${active ? "text-brand" : "text-fog group-hover:text-chalk"}`} />
              <span className="flex-1 font-medium">{n.label}</span>
              {n.badge && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-ink-950">
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-ink-850/70 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px] shadow-brand" />
          Free beta
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-fog">
          You&apos;re on the founding plan. Pricing locks when we launch paid.
        </p>
        <Link href="/#pricing" className="mt-3 block text-xs font-semibold text-chalk hover:text-brand">
          View plans →
        </Link>
      </div>
    </aside>
  );
}
