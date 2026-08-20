import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { ApiKeysPanel } from "@/components/dashboard/ApiKeysPanel";
import { DubbingPanel } from "@/components/dashboard/DubbingPanel";
import { getPrisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { checkVideoQuota } from "@/server/limits";
import { planFor } from "@/lib/plans";
import { hasDatabase } from "@/server/db";

async function PlanUsage() {
  if (!hasDatabase) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const quota = await checkVideoQuota(user.tenantId);
  const limits = planFor(user.plan);
  const pct =
    quota.limit === null ? 0 : Math.min(100, Math.round((quota.used / quota.limit) * 100));
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Plan &amp; usage</h3>
          <p className="mt-0.5 text-sm text-fog">
            You&apos;re on <span className="font-semibold text-brand">{limits.label}</span>
            {quota.limit === null
              ? " — unlimited videos."
              : ` — ${quota.used} of ${quota.limit} videos this month.`}
          </p>
        </div>
        <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-brand">
          {limits.label}
        </span>
      </div>
      {quota.limit !== null && (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-magenta"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

async function Dubbing() {
  if (!hasDatabase) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const prisma = getPrisma()!;
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { dubLanguages: true },
  });
  const initial = (tenant?.dubLanguages ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  const limits = planFor(user.plan);
  return <DubbingPanel initial={initial} cap={limits.dubLanguages} planLabel={limits.label} />;
}

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Branding, captions, posting cadence, and safety — all in one place." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <PlanUsage />
        <Dubbing />
        <SettingsForm />
        <ApiKeysPanel />
      </div>
    </>
  );
}
