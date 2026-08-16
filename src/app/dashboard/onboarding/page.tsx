import { Topbar } from "@/components/dashboard/Topbar";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <>
      <Topbar
        title="Account setup"
        subtitle="The safe way to stand up your posting accounts. You create them; WinClipz automates the rest."
      />
      <div className="px-5 py-6 sm:px-8">
        <OnboardingWizard />
      </div>
    </>
  );
}
