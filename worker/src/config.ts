/** Worker configuration from the environment. */
export const config = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
  workDir: process.env.WORK_DIR ?? "/tmp/winz",
  fontFile: process.env.CAPTION_FONT ?? undefined, // e.g. /usr/share/fonts/.../Inter-Bold.ttf

  // Transcription: local faster-whisper, or Groq's hosted whisper-large-v3-turbo.
  whisper: {
    mode: (process.env.WHISPER_MODE ?? "local") as "local" | "groq",
    model: process.env.WHISPER_MODEL ?? "large-v3-turbo",
    groqKey: process.env.GROQ_API_KEY,
  },

  // LLM scoring + titles.
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.SCORING_MODEL ?? "claude-haiku-4-5-20251001",
  },

  // Music detection.
  audd: { apiKey: process.env.AUDD_API_KEY },

  // How many top moments to turn into clips per stream.
  maxClipsPerStream: Number(process.env.MAX_CLIPS_PER_STREAM ?? 12),
};
