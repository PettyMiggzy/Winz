import { IconPlay } from "@/components/Icons";

/**
 * A stylized 9:16 clip preview: gradient "video", burned-in karaoke caption,
 * centered channel watermark, and a virality score chip. Pure CSS — no media.
 */
export function ClipPhone({
  caption = "down 1v4… then THIS",
  handle = "kick.com/WinslowBankz",
  score = 94,
  tint = "from-brand/40 via-violet/30 to-magenta/40",
  className = "",
}: {
  caption?: string;
  handle?: string;
  score?: number;
  tint?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-[1.6rem] border border-line bg-ink-800 shadow-card ${className}`}
    >
      {/* "video" */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent,rgba(0,0,0,0.55))]" />

      {/* top row: score + live tag */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold text-brand backdrop-blur">
          🔥 {score}
        </span>
        <span className="rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-medium text-chalk/90 backdrop-blur">
          0:24
        </span>
      </div>

      {/* center play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-ink-950/50 backdrop-blur">
          <IconPlay className="h-6 w-6 translate-x-0.5 text-chalk" />
        </div>
      </div>

      {/* centered watermark (the money element) */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <span className="rounded-md bg-ink-950/35 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white/90 backdrop-blur-sm">
          {handle}
        </span>
      </div>

      {/* karaoke caption */}
      <div className="absolute inset-x-0 bottom-14 flex justify-center px-4">
        <span className="rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-center text-sm font-extrabold uppercase leading-tight tracking-tight text-white backdrop-blur">
          <span className="text-brand">{caption.split(" ")[0]} </span>
          {caption.split(" ").slice(1).join(" ")}
        </span>
      </div>

      {/* bottom handle bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand to-magenta" />
        <div className="text-[11px] font-semibold text-white/90">@winslowbankz</div>
      </div>
    </div>
  );
}
