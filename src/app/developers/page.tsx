import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "WinClipz API",
  description: "Submit videos, get AI-cut vertical clips back. REST API for developers.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-ink-900 p-4 text-[13px] leading-relaxed text-chalk/90">
      <code>{children}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <>
      <Nav />
      <main className="container-x pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl pb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Developers</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">The WinClipz API</h1>
          <p className="mt-3 text-lg leading-relaxed text-fog">
            Send us a video URL, get back scored, captioned, 9:16 clips. The same engine
            behind the dashboard, as a REST API. Free while in beta.
          </p>

          <h2 className="mt-12 text-xl font-bold">Authentication</h2>
          <p className="mt-2 leading-relaxed text-fog">
            Create a key in <Link href="/dashboard/settings" className="text-brand hover:underline">Dashboard → Settings → API keys</Link>,
            then send it as a bearer token. Keys are scoped to your workspace.
          </p>
          <Code>{`Authorization: Bearer wcz_your_key_here`}</Code>

          <h2 className="mt-12 text-xl font-bold">Submit a video</h2>
          <p className="mt-2 leading-relaxed text-fog">
            Any public video URL (YouTube, Kick, Twitch, or a direct MP4). Only submit
            content you own or have permission to use.
          </p>
          <Code>{`POST https://www.winclipz.net/api/v1/streams
Content-Type: application/json

{ "url": "https://www.youtube.com/watch?v=…", "title": "optional" }

→ 201 { "id": "stream_id", "status": "QUEUED" }`}</Code>

          <h2 className="mt-12 text-xl font-bold">Check status & get clips</h2>
          <p className="mt-2 leading-relaxed text-fog">
            Poll until <code className="text-chalk">status</code> is <code className="text-chalk">DONE</code> —
            typically a few minutes, depending on video length.
          </p>
          <Code>{`GET https://www.winclipz.net/api/v1/streams/{id}

→ 200 {
  "id": "…", "status": "DONE",
  "clips": [{
    "id": "…",
    "title": "He's Back In His Zone",
    "caption": "the hook the AI wrote",
    "durationSec": 12,
    "score": 80,
    "videoUrl": "https://…/clip.mp4"
  }]
}`}</Code>

          <h2 className="mt-12 text-xl font-bold">List all clips</h2>
          <Code>{`GET https://www.winclipz.net/api/v1/clips

→ 200 { "clips": [ … newest 100 … ] }`}</Code>

          <h2 className="mt-12 text-xl font-bold">cURL quickstart</h2>
          <Code>{`curl -X POST https://www.winclipz.net/api/v1/streams \\
  -H "Authorization: Bearer wcz_…" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://www.youtube.com/watch?v=…"}'`}</Code>

          <div className="mt-14 rounded-2xl border border-brand/30 bg-brand/5 p-7 text-center">
            <h2 className="text-xl font-bold">Build something</h2>
            <p className="mx-auto mt-2 max-w-md text-fog">
              Sign up, grab a key from Settings, and you&apos;re clipping in one request.
            </p>
            <Link href="/signup" className="btn-primary mt-5 inline-flex px-7 py-3 text-base">
              Get an API key
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
