import { IconTikTok, IconYouTube, IconInstagram, IconKick } from "@/components/Icons";
import type { Platform } from "@/lib/mock";

const MAP = {
  tiktok: { Icon: IconTikTok, label: "TikTok", color: "text-chalk" },
  youtube: { Icon: IconYouTube, label: "YouTube Shorts", color: "text-[#ff5c5c]" },
  instagram: { Icon: IconInstagram, label: "Instagram Reels", color: "text-magenta-soft" },
  kick: { Icon: IconKick, label: "Kick", color: "text-brand" },
} as const;

export function PlatformBadge({
  platform,
  showLabel = false,
  className = "",
}: {
  platform: Platform | "kick";
  showLabel?: boolean;
  className?: string;
}) {
  const { Icon, label, color } = MAP[platform];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className={`h-[18px] w-[18px] ${color}`} />
      {showLabel && <span className="text-sm text-fog">{label}</span>}
    </span>
  );
}

export function platformLabel(platform: Platform | "kick") {
  return MAP[platform].label;
}
