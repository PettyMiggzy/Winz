import { Topbar } from "@/components/dashboard/Topbar";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { getReviewClips, getAccounts } from "@/server/store";

export default async function ReviewPage() {
  const [toReview, accounts] = await Promise.all([getReviewClips(), getAccounts()]);
  // Every connected TikTok handle the approval will fan out to — the dialog
  // shows all of them, never a single placeholder.
  const tiktokHandles = accounts
    .filter((a) => a.platform === "tiktok" && a.connected)
    .map((a) => a.handle);
  return (
    <>
      <Topbar
        title="Review queue"
        subtitle="Quick-check each clip before it posts. Approve, skip, or change where it goes."
      />
      <div className="px-5 py-6 sm:px-8">
        <ReviewQueue initial={toReview} tiktokHandles={tiktokHandles} />
      </div>
    </>
  );
}
