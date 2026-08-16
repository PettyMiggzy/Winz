/**
 * Build the FFmpeg argv for a clip and run it. buildRenderArgs is pure and
 * testable; runRender spawns the ffmpeg binary (installed on the host).
 */

import { spawn } from "node:child_process";
import { buildFilterComplex, type Layout } from "./layouts.js";
import { buildEncodeArgs, clampDuration, type Platform } from "./encode.js";

export interface RenderSpec {
  input: string;
  output: string;
  startSec: number;
  endSec: number;
  platform: Platform;
  layout: Layout;
  watermark: string;
  assPath?: string;
  fontFile?: string;
  ffmpegPath?: string;
}

/** Pure: assemble the full ffmpeg argument vector for one clip render. */
export function buildRenderArgs(spec: RenderSpec): string[] {
  const dur = clampDuration(spec.endSec - spec.startSec, spec.platform);
  const { filterComplex, outLabel } = buildFilterComplex({
    layout: spec.layout,
    watermark: spec.watermark,
    assPath: spec.assPath,
    fontFile: spec.fontFile,
  });
  return [
    "-y",
    "-ss", spec.startSec.toFixed(3),
    "-t", dur.toFixed(3),
    "-i", spec.input,
    "-filter_complex", filterComplex,
    "-map", outLabel,
    "-map", "0:a?", // original audio if present
    ...buildEncodeArgs(spec.platform),
    "-shortest",
    spec.output,
  ];
}

export function runRender(spec: RenderSpec): Promise<{ output: string }> {
  const bin = spec.ffmpegPath ?? "ffmpeg";
  const args = buildRenderArgs(spec);
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ output: spec.output });
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-800)}`));
    });
  });
}
