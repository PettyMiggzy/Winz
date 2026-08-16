/**
 * Pure-CSS entrance animation. No JS, no client boundary — so the content is
 * present and visible in the server-rendered HTML (good for no-JS, SEO, and
 * platform reviewers who fetch the page). The animation is a progressive
 * enhancement that always ends fully visible, and is disabled under
 * prefers-reduced-motion (see globals.css).
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
