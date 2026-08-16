import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = "https://winz.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Winz — Turn your streams into clips that grow your channel",
    template: "%s · Winz",
  },
  description:
    "Winz turns every livestream into branded vertical clips and posts them to TikTok, YouTube Shorts, and Instagram Reels automatically — so every viral moment drives viewers back to your channel.",
  keywords: [
    "kick clips", "stream clips", "auto clipping", "tiktok automation",
    "youtube shorts", "instagram reels", "streamer growth", "clip distribution",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    title: "Winz — Turn your streams into clips that grow your channel",
    description:
      "Automatic highlight clips from your streams, branded and posted everywhere. Focus on going live — Winz handles the rest.",
    images: [{ url: "/generated/og.webp", width: 1216, height: 640, alt: "Winz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Winz — clips that grow your channel",
    description:
      "Automatic highlight clips from your streams, branded and posted everywhere.",
    images: ["/generated/og.webp"],
  },
  // Favicon + apple/PWA icons are provided by src/app/icon.svg and
  // src/app/apple-icon.png via Next's file conventions.
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
