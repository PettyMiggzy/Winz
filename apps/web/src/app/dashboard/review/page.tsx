import { Topbar } from "@/components/dashboard/Topbar";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { clips } from "@/lib/mock";

export default function ReviewPage() {
  const toReview = clips.filter((c) => c.status === "review");
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
