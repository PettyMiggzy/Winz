import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="hairline mt-24">
      <div className="container-x py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-fog">
              Turn every stream into clips that grow your channel. Built for
              Kick creators first.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol title="Product" links={[
              { href: "/how-to", label: "How to use it" },
              { href: "/#features", label: "Features" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/dashboard", label: "Dashboard demo" },
            ]} />
            <FooterCol title="Company" links={[
              { href: "/#proof", label: "The proof" },
              { href: "/#faq", label: "FAQ" },
              { href: "mailto:hello@winz.app", label: "Contact" },
            ]} />
            <FooterCol title="Legal" links={[
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
            ]} />
          </div>
        </div>
        <div className="hairline mt-10 flex flex-col gap-3 pt-6 text-xs text-fog sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WinClipz. All rights reserved.</p>
          <p className="max-w-xl sm:text-right">
            WinClipz distributes your own content to your own connected accounts.
            You are responsible for the rights to what you upload.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-chalk">{title}</h4>
      <ul className="mt-3 space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-sm text-fog transition-colors hover:text-chalk">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
