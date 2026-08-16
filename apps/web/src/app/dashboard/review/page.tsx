import { Topbar } from "@/components/dashboard/Topbar";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { getReviewClips } from "@/server/store";

export default async function ReviewPage() {
  const toReview = await getReviewClips();
  return (
    <>
      <Topbar
        title="Review queue"
        subtitle="Quick-check each clip before it posts. Approve, skip, or change where it goes."
      />
      <div className="px-5 py-6 sm:px-8">
        <ReviewQueue initial={toReview} />
      </div>
    </>
  );
}
