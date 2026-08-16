import Link from "next/link";

export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  // A "play button made of a rising clip spark" — the W notch reads as both
  // a play triangle and a signal peak. Pure SVG, scales crisp, theme-safe.
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="winz-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5cf0a8" />
          <stop offset="0.55" stopColor="#19e57f" />
          <stop offset="1" stopColor="#ff3d81" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="#0b0b0e" stroke="url(#winz-mark)" strokeWidth="1.5" />
      <path
        d="M11 13 L15.5 27 L20 18 L24.5 27 L29 13"
        fill="none"
        stroke="url(#winz-mark)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string | null;
  compact?: boolean;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark className="h-8 w-8" />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-chalk">
          Winz<span className="text-brand">.</span>
        </span>
      )}
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="transition-opacity hover:opacity-90">
      {inner}
    </Link>
  );
}
