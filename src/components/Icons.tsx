import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconBolt = (p: P) => (
  <svg {...base(p)}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
);
export const IconScissors = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></svg>
);
export const IconCaptions = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 13.5a2.5 2.5 0 1 0 0-3M15 13.5a2.5 2.5 0 1 0 0-3" /></svg>
);
export const IconBrand = (p: P) => (
  <svg {...base(p)}><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconShuffle = (p: P) => (
  <svg {...base(p)}><path d="M18 4h3v3M18 20h3v-3M3 4l7 7M3 20l7-7M14 10l7-6M14 14l7 6" /></svg>
);
export const IconMusicOff = (p: P) => (
  <svg {...base(p)}><path d="M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm0 0V6l8-2M3 3l18 18" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base(p)}><path d="M3 3v18h18M8 14v3M13 9v8M18 5v12" /></svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m20 6-11 11-5-5" /></svg>
);
export const IconArrow = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5v14l11-7Z" /></svg>
);
export const IconGrid = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconInbox = (p: P) => (
  <svg {...base(p)}><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5L5 5Z" /></svg>
);
export const IconLink = (p: P) => (
  <svg {...base(p)}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
);
export const IconSettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 6 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 6 8.1L5.9 8a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 12 3.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 20.5 11h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.1.9Z" /></svg>
);
export const IconHeart = (p: P) => (
  <svg {...base(p)}><path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 5a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" /></svg>
);
export const IconEye = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);

/* Brand glyphs (simplified, monochrome) */
export const IconTikTok = (p: P) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" {...p}>
    <path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.6c-1.3.1-2.6-.3-3.7-1v6.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.7a3 3 0 1 0 2.1 2.9V3h2.9Z" />
  </svg>
);
export const IconYouTube = (p: P) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" {...p}>
    <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.7 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.3-3.8.3-3.8s0-2.5-.3-3.8ZM10 15V9l5.2 3L10 15Z" />
  </svg>
);
export const IconInstagram = (p: P) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.75} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
export const IconKick = (p: P) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" {...p}>
    <path d="M4 3h5v6h2V6h2V3h6v6h-2v3h-2v0h2v3h2v6h-6v-3h-2v-3H9v6H4V3Z" />
  </svg>
);
