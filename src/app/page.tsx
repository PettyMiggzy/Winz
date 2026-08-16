import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { Reveal } from "@/components/ui/Reveal";
import { ClipPhone } from "@/components/ClipPhone";
import { PlatformBadge } from "@/components/PlatformBadge";
import {
  IconBolt, IconScissors, IconCaptions, IconBrand, IconShuffle,
  IconMusicOff, IconChart, IconArrow, IconCheck, IconClock,
} from "@/components/Icons";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="overflow-clip">
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Anatomy />
        <Features />
        <Proof />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ Hero */
function Hero() {
  return (
    <section className="relative pt-28 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/generated/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
      </div>

      <div className="container-x grid items-center gap-12 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Reveal>
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px] shadow-brand" />
              Now onboarding Kick creators · free beta
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Your streams are full of{" "}
              <span className="gradient-text">viral moments.</span> Winz posts
              them everywhere for you.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fog">
              Go live. The second you end, Winz finds your best moments, cuts
              them into branded vertical clips with captions, and posts them to
              TikTok, YouTube Shorts, and Instagram Reels — each one driving
              viewers back to your channel.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Start free <IconArrow className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="btn-ghost px-6 py-3 text-base">
                See the dashboard
              </Link>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fog">
              <span className="inline-flex items-center gap-2"><IconCheck className="h-4 w-4 text-brand" /> No credit card</span>
              <span className="inline-flex items-center gap-2"><IconCheck className="h-4 w-4 text-brand" /> Your content, your accounts</span>
              <span className="inline-flex items-center gap-2"><IconClock className="h-4 w-4 text-brand" /> Clips live in minutes</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative mx-auto w-full max-w-sm">
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand/10 blur-3xl" />
            <div className="grid grid-cols-2 gap-4">
              <ClipPhone className="animate-float" caption="down 1v4… then THIS" score={94} />
              <ClipPhone
                className="mt-8 animate-float [animation-delay:1.5s]"
                caption="chat went feral 😭"
                tint="from-magenta/40 via-violet/30 to-brand/30"
                score={91}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- TrustBar */
function TrustBar() {
  return (
    <section className="hairline border-b border-line">
      <div className="container-x flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
        <p className="text-sm text-fog">Posts everywhere that matters:</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <PlatformBadge platform="tiktok" showLabel />
          <PlatformBadge platform="youtube" showLabel />
          <PlatformBadge platform="instagram" showLabel />
          <span className="pill"><PlatformBadge platform="kick" /> Kick-native</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ HowItWorks */
const STEPS = [
  { n: "01", t: "You go live", d: "Stream on Kick like you always do. Winz captures your broadcast in the background — no extra software to babysit.", Icon: IconBolt },
  { n: "02", t: "AI finds the moments", d: "The second you end, Winz scores your stream on audio spikes, chat velocity, and what was actually said — and pulls the clips worth posting.", Icon: IconScissors },
  { n: "03", t: "It brands & captions", d: "Each clip gets a vertical crop, animated captions, a catchy hook title, and your channel link front and center.", Icon: IconBrand },
  { n: "04", t: "It posts everywhere", d: "Different clips go to each of your accounts on TikTok, Shorts, and Reels — on a schedule that looks human, not botted.", Icon: IconShuffle },
];

function HowItWorks() {
  return (
    <section id="how" className="relative py-24">
      <div className="container-x">
        <SectionHead
          eyebrow="How it works"
          title="From live to viral while you sleep"
          sub="Four steps, zero editing. You focus on the stream — Winz runs the whole clip machine."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="card group h-full p-6 transition-colors hover:border-brand/30">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink-800 text-brand transition-colors group-hover:border-brand/40">
                    <s.Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-ink-600">{s.n}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Anatomy */
function Anatomy() {
  const points = [
    { t: "Hook in the first second", d: "A punchy title bar that stops the scroll before anyone decides to swipe." },
    { t: "Word-by-word captions", d: "TikTok-style karaoke captions — 85% of viewers watch on mute." },
    { t: "Your channel, dead center", d: "kick.com/yourname sits where no platform's UI ever covers it." },
    { t: "Safe-zone aware", d: "Nothing important hides behind the like button or the caption rail." },
  ];
  return (
    <section className="relative py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal className="order-2 mx-auto w-full max-w-[15rem] lg:order-1">
          <ClipPhone caption="he called his shot 🎯" score={88} tint="from-violet/40 via-brand/20 to-magenta/30" />
        </Reveal>
        <div className="order-1 lg:order-2">
          <SectionHead
            align="left"
            eyebrow="Built to convert"
            title="Every clip is engineered to send viewers to you"
            sub="It's not enough to go viral — the clip has to make people follow. Winz builds each one to do exactly that."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {points.map((p, i) => (
              <Reveal key={p.t} delay={i * 80}>
                <div className="flex gap-3">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                    <IconCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{p.t}</h4>
                    <p className="mt-1 text-sm text-fog">{p.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Features */
const FEATURES = [
  { Icon: IconScissors, t: "Smart highlight detection", d: "Three signals — audio energy, chat velocity, and transcript scoring — combine to find the moments that actually pop, not random cuts." },
  { Icon: IconCaptions, t: "Auto captions & hooks", d: "Animated word-by-word captions and AI-written hook titles tuned for each platform's first-second scroll test." },
  { Icon: IconBrand, t: "Your branding, baked in", d: "Channel watermark, colors, and handle on every clip — placed in the safe zone so it's never cropped or covered." },
  { Icon: IconShuffle, t: "Different clips per account", d: "Platforms bury duplicate videos. Winz sends a different clip to each account, with unique hooks and human-jittered timing." },
  { Icon: IconMusicOff, t: "Copyright safety net", d: "Every clip is checked for claimed music before it posts — flagged moments are skipped or stripped, so your accounts stay alive." },
  { Icon: IconChart, t: "Growth analytics", d: "See which clips drove views, profile clicks, and follows — and Winz gets smarter about what to clip next." },
];

function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="absolute inset-0 -z-10 grid-bg" />
      <div className="container-x">
        <SectionHead
          eyebrow="Features"
          title="A full clip team, running on autopilot"
          sub="Everything a paid clipper does — detection, editing, branding, posting, and knowing what works — without the clip farm."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 90}>
              <div className="card group h-full p-6 transition-all hover:-translate-y-0.5 hover:border-brand/30">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink-800 text-brand transition-colors group-hover:border-brand/40 group-hover:shadow-glow">
                  <f.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Proof */
function Proof() {
  return (
    <section id="proof" className="relative py-24">
      <div className="container-x">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-magenta/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="eyebrow">Why we built this</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                The big Kick streamers didn&apos;t out-work you. They out-clipped you.
              </h2>
              <p className="mt-5 text-fog">
                Creators like Adin Ross and N3on grew on an army of clippers
                flooding short-form with their best moments. That machine costs
                six figures a month and a thousand people. Winz gives you the
                same flywheel — your own footage, your own branding — for the
                price of a couple of emotes.
              </p>
              <p className="mt-4 text-fog">
                We run it on{" "}
                <span className="font-semibold text-chalk">Kick.com/WinslowBankz</span>{" "}
                every single day. If it can grow one channel from scratch, it
                can grow yours.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-4">
                <Stat k="Clips / stream" v="8–14" />
                <Stat k="Live in" v="~6 min" />
                <Stat k="Platforms" v="3+" />
              </div>
            </div>
            <div className="mx-auto w-full max-w-[13rem]">
              <ClipPhone caption="the funniest 20s 💀" score={90} tint="from-brand/40 via-brand/10 to-magenta/30" />
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-fog">
          Winz grows channels through consistent short-form distribution. It is
          not a get-rich promise — results depend on your content and consistency.
        </p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Pricing */
function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="container-x">
        <SectionHead
          eyebrow="Pricing"
          title="Free while we're in beta"
          sub="Get in now and lock founding-creator pricing forever. No card required to start."
        />
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <Reveal>
            <PlanCard
              name="Creator"
              price="Free"
              tag="During beta"
              blurb="Everything you need to run the flywheel on one channel."
              cta="Start free"
              href="/signup"
              features={[
                "Auto clips from every stream",
                "Captions, hooks & your branding",
                "Post to TikTok, Shorts & Reels",
                "2 accounts each on TikTok & Reels · 1 YouTube",
                "Guided account setup + safe warm-up",
                "Copyright music safety net",
              ]}
            />
          </Reveal>
          <Reveal delay={100}>
            <PlanCard
              highlight
              name="Pro"
              price="$15"
              per="/mo"
              tag="Founding price"
              blurb="For creators scaling to a full account network."
              cta="Join the waitlist"
              href="/signup"
              features={[
                "Everything in Creator",
                "4 TikTok + 4 Reels + 2 YouTube accounts",
                "Priority rendering queue",
                "1080p60 · no watermark",
                "Best-of compilation exports",
                "Per-account A/B on hooks",
              ]}
            />
          </Reveal>
        </div>
        <p className="mt-6 text-center text-sm text-fog">
          Flat pricing. No per-clip credits, no surprise add-ons.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- FAQ */
const FAQS = [
  { q: "Do I need to give you my passwords?", a: "Never. You connect each account through the platform's official login (OAuth). You can disconnect any time, and we only ever post to accounts you connect yourself." },
  { q: "Is this against TikTok / YouTube / Instagram rules?", a: "No — posting your own content to your own accounts through the official APIs is exactly what tools like Buffer and Later do. Winz sends different clips to each account and spaces them out, which is what keeps reach healthy." },
  { q: "What about copyrighted music in my streams?", a: "Every clip is scanned for claimed music before it posts. Flagged moments are skipped or have the music stripped, so you don't rack up strikes on your accounts." },
  { q: "How do you get my Kick stream?", a: "Kick doesn't offer a public download API, so Winz captures your own broadcast at the source — a lightweight recorder or upload you control. It's higher quality than scraping and keeps everything above board." },
  { q: "Do clips really bring viewers back?", a: "Short-form is how small channels get discovered in 2026 — every clip carries your channel name and link. It's a months-long game of consistency, and Winz makes consistency automatic." },
  { q: "When does it cost money?", a: "It's free during the beta. When we introduce paid plans, anyone who joined early keeps founding-creator pricing." },
];

function FAQ() {
  return (
    <section id="faq" className="relative py-24">
      <div className="container-x">
        <SectionHead eyebrow="FAQ" title="Questions, answered" />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-ink-850/60">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary]:cursor-pointer">
              <summary className="flex items-center justify-between gap-4 text-left font-semibold marker:content-none">
                {f.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-fog transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-fog">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- FinalCTA */
function FinalCTA() {
  return (
    <section className="relative py-16">
      <div className="container-x">
        <div className="card relative overflow-hidden px-8 py-14 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
            <div className="absolute left-1/2 top-0 h-40 w-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
          </div>
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Go live tonight. Wake up to clips everywhere.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-fog">
            Join the beta free and let Winz turn your next stream into a week of
            content.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn-primary px-7 py-3 text-base">
              Start free <IconArrow className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="btn-ghost px-7 py-3 text-base">
              Explore the dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- shared */
function SectionHead({
  eyebrow, title, sub, align = "center",
}: {
  eyebrow: string; title: string; sub?: string; align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Reveal>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        {sub && <p className="mt-4 text-fog">{sub}</p>}
      </Reveal>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/60 p-4 text-center">
      <div className="text-2xl font-extrabold text-brand">{v}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-fog">{k}</div>
    </div>
  );
}

function PlanCard({
  name, price, per, tag, blurb, cta, href, features, highlight = false,
}: {
  name: string; price: string; per?: string; tag: string; blurb: string;
  cta: string; href: string; features: string[]; highlight?: boolean;
}) {
  return (
    <div className={`relative h-full rounded-2xl border p-7 ${highlight ? "border-brand/40 bg-ink-850 shadow-glow" : "border-line bg-ink-850/60"}`}>
      {highlight && (
        <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-ink-950">
          Most popular
        </span>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className="pill">{tag}</span>
      </div>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-4xl font-extrabold tracking-tight">{price}</span>
        {per && <span className="pb-1 text-sm text-fog">{per}</span>}
      </div>
      <p className="mt-2 text-sm text-fog">{blurb}</p>
      <Link href={href} className={`${highlight ? "btn-primary" : "btn-ghost"} mt-6 w-full`}>
        {cta}
      </Link>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span className="text-chalk/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
