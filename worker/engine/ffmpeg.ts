import { spawn } from 'node:child_process';

export function run(cmd: string, args: string[], opts: { collectStderr?: boolean } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve(opts.collectStderr ? err : out);
      else reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`));
    });
  });
}

export async function probeDuration(file: string): Promise<number> {
  const out = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const d = parseFloat(out.trim());
  if (!Number.isFinite(d)) throw new Error(`ffprobe: could not read duration of ${file}`);
  return d;
}

/** 16 kHz mono mp3 — small enough for hosted Whisper APIs (~10 MB / 30 min). */
export async function extractAudio(input: string, outFile: string, startSec?: number, durSec?: number): Promise<string> {
  const args = ['-y', '-v', 'error'];
  if (startSec !== undefined) args.push('-ss', String(startSec));
  args.push('-i', input);
  if (durSec !== undefined) args.push('-t', String(durSec));
  args.push('-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '48k', outFile);
  await run('ffmpeg', args);
  return outFile;
}
