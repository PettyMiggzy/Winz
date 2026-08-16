# WinClipz worker — the clip engine. Needs FFmpeg (with libass + ebur128) + fonts.
# Build context = repo root:  docker build -f worker/Dockerfile -t winclipz-worker .
FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY worker/package.json ./
RUN npm install --no-audit --no-fund
COPY worker/ ./

ENV WORK_DIR=/tmp/winclipz
CMD ["npm", "start"]
