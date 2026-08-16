import { Topbar } from "@/components/dashboard/Topbar";
import { UploadForm } from "@/components/dashboard/UploadForm";

export default function UploadPage() {
  return (
    <>
      <Topbar
        title="Upload a video"
        subtitle="Drop a stream VOD or a YouTube export — the engine turns it into ranked, captioned clips."
      />
      <div className="px-5 py-6 sm:px-8">
        <UploadForm />
      </div>
    </>
  );
}
