import { Topbar } from "@/components/dashboard/Topbar";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { getReviewClips, getAccounts } from "@/server/store";

export default async function ReviewPage() {
  const [toReview, accounts] = await Promise.all([getReviewClips(), getAccounts()]);
  // Real connected TikTok handle for the consent dialog — never a placeholder.
  const tiktokHandle =
    accounts.find((a) => a.platform === "tiktok" && a.connected)?.handle ?? null;
  return (
    <>
      <Topbar
        title="Review queue"
        subtitle="Quick-check each clip before it posts. Approve, skip, or change where it goes."
      />
      <div className="px-5 py-6 sm:px-8">
        <ReviewQueue initial={toReview} tiktokHandle={tiktokHandle} />
      </div>
    </>
  );
}
