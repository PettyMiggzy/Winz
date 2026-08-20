import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "How to use WinClipz",
  description: "Upload a stream, let the AI cut the best moments, approve, and auto-post to your socials.",
};

interface Step {
  n: string;
  h: string;
  body: React.ReactNode;
}

const steps: Step[] = [
  {
    n: "1",
    h: "Connect Kick — then never touch it again",
    body: (
      <>
        <p>
          In <Code>Dashboard → Accounts</Code>, hit <b>Connect Kick</b>. From then
          on, the moment a stream ends WinClipz grabs the VOD by itself and starts
          cutting. You wake up to a review queue full of clips — nothing to upload,
          nothing to paste.
        </p>
        <p>
          Prefer to do it by hand, or clip something that isn&rsquo;t a Kick stream?
          Every step below still works on its own.
        </p>
      </>
    ),
  },
  {
    n: "2",
    h: "Or add a video yourself",
    body: (
      <>
        <p>
          Go to <Code>Dashboard → Upload</Code> — paste a link (YouTube, Kick,
          Twitch) or drag in a video file. Any MP4 works — a full stream VOD, a YouTube export, or a short
          recording. The file uploads straight to secure storage; nothing is posted
          anywhere yet.
        </p>
        <p>
          Bigger files take longer to upload. A 2–5 minute clip is perfect for a first
          run; full streams are fine once you&rsquo;ve seen it work.
        </p>
      </>
    ),
  },
  {
    n: "3",
    h: "The AI finds the best moments",
    body: (
      <>
        <p>
          As soon as the upload finishes, WinClipz gets to work automatically. It
          listens to the whole video, reads what&rsquo;s being said, and looks for the
          moments most likely to pop — spikes in energy and volume, chat going crazy,
          and punchy quotes worth clipping.
        </p>
        <p>
          Each moment becomes a vertical (9:16) clip with burned-in captions, a title,
          and a hook — ready for TikTok, Reels, and Shorts. This takes a couple of
          minutes per video.
        </p>
      </>
    ),
  },
  {
    n: "4",
    h: "Review &amp; approve",
    body: (
      <>
        <p>
          Finished clips land in <Code>Dashboard → Review</Code>. Each one shows its
          title, caption, length, and why the AI picked it. You&rsquo;re the editor:
        </p>
        <ul>
          <li><b>Approve</b> a clip to send it out.</li>
          <li><b>Skip</b> the ones that miss.</li>
          <li>Optionally pick which platform a clip goes to.</li>
        </ul>
        <p>Nothing posts until you approve it — you&rsquo;re always in control.</p>
      </>
    ),
  },
  {
    n: "5",
    h: "Connect your posting accounts",
    body: (
      <>
        <p>
          In <Code>Dashboard → Accounts</Code>, connect the TikTok, Instagram, and
          YouTube accounts you want clips posted to. You log in through the platform&rsquo;s
          own secure login — <b>WinClipz never sees or stores your passwords</b>, and
          you can disconnect any account at any time.
        </p>
        <p>
          New accounts start slow on purpose (a warm-up ramp) so platforms don&rsquo;t flag
          them for posting too much too fast. WinClipz handles that pacing for you.
        </p>
      </>
    ),
  },
  {
    n: "6",
    h: "Auto-posting",
    body: (
      <>
        <p>
          When you approve a clip, WinClipz automatically posts it to your connected
          accounts — with the caption and title already written. Every clip drives
          viewers back to your Kick channel.
        </p>
        <p>
          Track what went out in <Code>Dashboard → Analytics</Code>: which clips posted,
          where, and how they&rsquo;re doing.
        </p>
      </>
    ),
  },
];

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need to download my videos first?",
    a: <>Only if they&rsquo;re on a platform that blocks downloads. Any MP4 on your phone or computer works — including a screen recording of a stream.</>,
  },
  {
    q: "Will the same clip get flagged for being posted to multiple accounts?",
    a: <>WinClipz cuts multiple distinct moments from each video, and when a clip posts to more than one of your accounts it&rsquo;s spaced out on a staggered schedule (90+ minutes apart, never simultaneously) rather than blasted everywhere at once. New accounts also ramp up gradually.</>,
  },
  {
    q: "Can my clips reach people who don't speak my language?",
    a: <>Yes — turn on translation in Settings and approved clips are also produced in other languages, <i>spoken in your own voice</i>. Each one lands in the review queue as its own clip, so you can post it to a separate account.</>,
  },
  {
    q: "Does it store my passwords?",
    a: <>No. You connect accounts through each platform&rsquo;s official login. WinClipz only holds a revocable access token — never a password — and you can disconnect anytime.</>,
  },
  {
    q: "How much does a video cost to process?",
    a: <>Pennies. The AI transcription and scoring for a 30-minute video runs a couple of cents.</>,
  },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-line bg-ink-850/70 px-1.5 py-0.5 text-[0.85em] font-medium text-chalk">
      {children}
    </span>
  );
}

export default function HowToPage() {
  return (
    <>
      <Nav />
      <main className="container-x pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl pb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Guide</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            How WinClipz works
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-fog">
            Upload a stream, let the AI cut the best moments, approve the winners, and
            auto-post them everywhere — all driving viewers back to your Kick. Here&rsquo;s
            the whole flow, start to finish.
          </p>

          <div className="mt-10 space-y-5">
            {steps.map((s) => (
              <section
                key={s.n}
                className="rounded-2xl border border-line bg-ink-850/50 p-6 sm:p-7"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand/15 text-base font-bold text-brand">
                    {s.n}
                  </span>
                  <h2
                    className="text-xl font-bold"
                    dangerouslySetInnerHTML={{ __html: s.h }}
                  />
                </div>
                <div className="mt-4 space-y-3 leading-relaxed text-fog [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <h2 className="mt-14 text-2xl font-bold">Common questions</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-line bg-ink-850/40 p-5">
                <p className="font-semibold text-chalk">{f.q}</p>
                <p className="mt-2 leading-relaxed text-fog">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-brand/30 bg-brand/5 p-7 text-center">
            <h2 className="text-xl font-bold">Ready to clip?</h2>
            <p className="mx-auto mt-2 max-w-md text-fog">
              Drop in a video and watch the AI cut your first batch.
            </p>
            <Link href="/dashboard/upload" className="btn-primary mt-5 inline-flex px-7 py-3 text-base">
              Upload a video
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
