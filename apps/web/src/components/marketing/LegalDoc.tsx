import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";

export interface LegalSection {
  h: string;
  body: React.ReactNode;
}

export function LegalDoc({
  title, updated, intro, sections,
}: {
  title: string; updated: string; intro: React.ReactNode; sections: LegalSection[];
}) {
  return (
    <>
      <Nav />
      <main className="container-x pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl pb-10">
          <div className="mb-8 rounded-xl border border-magenta/30 bg-magenta/5 px-4 py-3 text-sm text-magenta-soft">
            <strong className="font-semibold">Draft template.</strong> This document is a
            working draft to unblock development and platform review. Have it
            reviewed by a lawyer before public launch.
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-fog">Last updated: {updated}</p>

          <div className="mt-8 space-y-2 leading-relaxed text-fog">{intro}</div>

          <nav className="mt-8 rounded-2xl border border-line bg-ink-850/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fog">Contents</p>
            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {sections.map((s, i) => (
                <li key={s.h}>
                  <a href={`#s${i + 1}`} className="text-sm text-chalk/90 hover:text-brand">
                    {i + 1}. {s.h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
                <h2 className="text-xl font-bold">
                  {i + 1}. {s.h}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-fog">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
