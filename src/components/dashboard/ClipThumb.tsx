import { IconPlay } from "@/components/Icons";

export function ClipThumb({
  tint, duration, score, className = "",
}: {
  tint: string; duration: number; score: number; className?: string;
}) {
  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-ink-800 ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent,rgba(0,0,0,0.5))]" />
      <div className="absolute left-1 top-1 rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-bold text-brand backdrop-blur">
        {score}
      </div>
      <div className="absolute right-1 top-1 rounded bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-medium text-chalk backdrop-blur">
        {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-950/50 backdrop-blur">
          <IconPlay className="h-3.5 w-3.5 translate-x-px text-chalk" />
        </div>
      </div>
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <span className="rounded bg-ink-950/40 px-1 text-[8px] font-bold text-white/90 backdrop-blur-sm">
          kick.com/WinslowBankz
        </span>
      </div>
    </div>
  );
}
