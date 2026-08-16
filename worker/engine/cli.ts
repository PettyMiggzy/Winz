#!/usr/bin/env node
/** Usage: node --experimental-strip-types src/cli.ts <video> [outDir]
 *  (or `npx tsx src/cli.ts <video>` on Node < 22.6) */
import { processVideo } from './index.ts';

const [input, outDir = './clips-out'] = process.argv.slice(2);
if (!input) {
  console.error('usage: cli.ts <video-file> [out-dir]');
  process.exit(1);
}

const manifest = await processVideo(input, outDir, {
  styleHint: process.env.STYLE_HINT,
  layout: (process.env.LAYOUT as 'crop' | 'blurpad') ?? 'crop',
  onProgress: (stage, detail) => console.log(`[${stage}] ${detail ?? ''}`),
});

console.log('\n=== CLIPS ===');
for (const c of manifest.clips) {
  console.log(`\n${c.file}`);
  console.log(`  title:   ${c.title || '(manual title needed)'}`);
  console.log(`  window:  ${c.start.toFixed(1)}s → ${c.end.toFixed(1)}s  (score ${c.score}, ${c.category})`);
  console.log(`  caption: ${c.caption} ${c.hashtags.join(' ')}`);
  console.log(`  why:     ${c.reason}`);
}
if (manifest.dropped.length) {
  console.log('\n=== DROPPED ===');
  for (const d of manifest.dropped) console.log(`  ${d.title || '(untitled)'}: ${d.reason}`);
}
