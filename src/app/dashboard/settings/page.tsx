import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Branding, captions, posting cadence, and safety — all in one place." />
      <div className="px-5 py-6 sm:px-8">
        <SettingsForm />
      </div>
    </>
  );
}
