import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getSessionUser } from "@/server/auth";
import { hasDatabase } from "@/server/db";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Always render live so the dashboard reflects the database once configured.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Real deployments require a signed-in user; seed/demo mode stays open.
  if (hasDatabase) {
    const user = await getSessionUser();
    if (!user) redirect("/login");
  }
  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
