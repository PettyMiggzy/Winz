import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
