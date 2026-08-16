"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-line bg-ink-950/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm text-fog transition-colors hover:text-chalk"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-dim">Sign in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </div>
        <button
          className="btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <span className="text-sm">{open ? "Close" : "Menu"}</span>
        </button>
      </nav>
      {open && (
        <div className="border-t border-line bg-ink-900/95 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-fog hover:bg-ink-800 hover:text-chalk">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Sign in</Link>
              <Link href="/signup" className="btn-primary flex-1" onClick={() => setOpen(false)}>Start free</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
