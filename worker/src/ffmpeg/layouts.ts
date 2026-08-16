/**
 * 9:16 layout filtergraph builders + branding watermark. Pure string builders —
 * they compose FFmpeg -filter_complex graphs; rendering happens in render.ts.
 * Grounded in docs/research/06-video-pipeline.md.
 */

export const OUT_W = 1080;
export const OUT_H = 1920;

export type Layout = "crop" | "blur" | "stack";

/**
 * Layout stage: consumes [0:v], outputs [base] at 1080x1920.
 * - crop:  center-crop the 16:9 source to 9:16 (loses the sides)
 * - blur:  blurred fill background + centered full-width source (nothing lost)
 * - stack: facecam on top / gameplay below (two 1080x960 panels)
 */
export function layoutFilter(layout: Layout): string {
  switch (layout) {
    case "crop":
      // force_original_aspect_ratio=increase guarantees the scaled frame covers
      // 1080x1920 before the center crop, so narrower-than-9:16 sources don't
      // make crop request more width than the input has (ffmpeg error).
      return `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H}[base]`;
    case "blur":
      // boxblur (not gblur) — gblur is ~2x slower on CPU per the research.
      return (
        `[0:v]split=2[bg][fg];` +
        `[bg]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},boxblur=20:2[bgb];` +
        `[fg]scale=${OUT_W}:-2[fgs];` +
        `[bgb][fgs]overlay=(W-w)/2:(H-h)/2[base]`
      );
    case "stack": {
      const half = OUT_H / 2; // 960, even
      return (
        `[0:v]split=2[t][b];` +
        `[t]crop=iw:ih*0.5:0:0,scale=${OUT_W}:${half}:force_original_aspect_ratio=increase,crop=${OUT_W}:${half}[tp];` +
        `[b]scale=${OUT_W}:${half}:force_original_aspect_ratio=increase,crop=${OUT_W}:${half}[bp];` +
        `[tp][bp]vstack=inputs=2[base]`
      );
    }
  }
}

/**
 * Quote a string for use as a single-quoted FFmpeg filter option value.
 * Inside single quotes no escaping is performed, so an embedded apostrophe
 * must use the documented idiom: close quote, escaped quote, reopen ('\'').
 * Backslashes are stripped (multi-level filtergraph escaping makes them
 * hopeless in user text, and no channel branding legitimately needs one).
 */
export function escapeDrawtext(s: string): string {
  return s.replace(/\\/g, "").replace(/'/g, `'\\''`);
}

/**
 * Persistent channel watermark, centered vertically — the one place no
 * platform's UI ever covers (never bottom-right; that's the action rail).
 * expansion=none disables drawtext %{} expansion so % is literal.
 * Consumes [base], outputs [wm].
 */
export function watermarkFilter(text: string, opts: { fontFile?: string } = {}): string {
  const font = opts.fontFile ? `fontfile='${escapeDrawtext(opts.fontFile)}':` : "";
  return (
    `[base]drawtext=${font}expansion=none:text='${escapeDrawtext(text)}':` +
    `fontcolor=white@0.92:fontsize=34:` +
    `box=1:boxcolor=black@0.35:boxborderw=10:` +
    `x=(w-text_w)/2:y=(h-text_h)/2[wm]`
  );
}

/** Burn ASS karaoke captions. Consumes [wm], outputs [out]. */
export function captionFilter(assPath: string): string {
  return `[wm]ass='${escapeDrawtext(assPath)}'[out]`;
}

/**
 * Compose the full -filter_complex string and return it with the final output
 * label. If no caption file is given, the watermark stage is the output.
 */
export function buildFilterComplex(opts: {
  layout: Layout;
  watermark: string;
  assPath?: string;
  fontFile?: string;
}): { filterComplex: string; outLabel: string } {
  const parts = [layoutFilter(opts.layout), watermarkFilter(opts.watermark, { fontFile: opts.fontFile })];
  let outLabel = "[wm]";
  if (opts.assPath) {
    parts.push(captionFilter(opts.assPath));
    outLabel = "[out]";
  }
  return { filterComplex: parts.join(";"), outLabel };
}
