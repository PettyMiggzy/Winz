# WinClipz worker — the clip engine. Needs FFmpeg (with libass + ebur128) + fonts.
# Build context = repo root:  docker build -f worker/Dockerfile -t winclipz-worker .
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates curl python3 \
  && rm -rf /var/lib/apt/lists/*

# yt-dlp for link ingestion (YouTube, Kick, Twitch, …). Standalone binary.
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && yt-dlp --version

# Deno = yt-dlp's preferred JS runtime for YouTube extraction (better format
# access, fewer bot-checks). Official static binary, no deps.
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
  && curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
      -o /tmp/deno.zip \
  && unzip -q /tmp/deno.zip -d /usr/local/bin \
  && rm /tmp/deno.zip \
  && deno --version \
  && apt-get purge -y unzip && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/package.json ./
RUN npm install --no-audit --no-fund
COPY worker/ ./

ENV WORK_DIR=/tmp/winclipz
CMD ["npm", "start"]
