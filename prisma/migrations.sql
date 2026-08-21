-- Additive, idempotent schema migrations. SINGLE SOURCE OF TRUTH.
--
-- Run by BOTH the worker (at boot, worker/src/poll.ts) and the web app (at
-- build, scripts/migrate.mjs). That matters: the web app and the worker deploy
-- independently, so whichever ships first must be able to create what it needs.
-- When only the worker ran these, a web deploy carrying a new column would ask
-- Postgres for something that didn't exist yet and the dashboard would 500
-- until the worker caught up.
--
-- RULES for anything added here:
--   * Additive only. No DROP, no destructive ALTER, ever — this runs against
--     production on every deploy, and a Vercel build must never be able to
--     delete a column.
--   * Idempotent. IF NOT EXISTS on everything; it runs many times a day.
--   * No ALTER TYPE ... ADD VALUE. It's rejected inside a transaction block on
--     some servers; enum values stay in the worker where they're wrapped.

-- Stream: queue bookkeeping, deferred retries, chat linkage.
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "claimedAt" timestamptz;
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "notBefore" timestamptz;
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "chatCaptureId" text;

-- Post: publish options, queue bookkeeping, failure reason.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "meta" jsonb;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "claimedAt" timestamptz;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS error text;

-- Tenant: plan tier and per-workspace clip settings.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "plan" text NOT NULL DEFAULT 'FREE';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "dubLanguages" text;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "clipLayout" text NOT NULL DEFAULT 'crop';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "facecam" text;

-- Clip: dubbed variants and music screening results.
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "lang" text;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "sourceClipId" text;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "musicChecked" boolean NOT NULL DEFAULT false;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "musicTrack" text;

-- Auth.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" text;

CREATE TABLE IF NOT EXISTS "Session" (
  id text PRIMARY KEY,
  "tokenHash" text NOT NULL UNIQUE,
  "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "ApiKey" (
  id text PRIMARY KEY,
  "tenantId" text NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  name text NOT NULL,
  "keyHash" text NOT NULL UNIQUE,
  "lastUsedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

CREATE TABLE IF NOT EXISTS "RateLimit" (
  bucket text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  "resetAt" timestamptz NOT NULL
);

-- Translation queue.
CREATE TABLE IF NOT EXISTS "Dub" (
  id text PRIMARY KEY,
  "tenantId" text NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "clipId" text NOT NULL REFERENCES "Clip"(id) ON DELETE CASCADE,
  lang text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED',
  "externalId" text,
  "dubClipId" text,
  error text,
  "claimedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "Dub_clip_lang_uniq" ON "Dub"("clipId", lang);
CREATE INDEX IF NOT EXISTS "Dub_tenantId_idx" ON "Dub"("tenantId");

-- Live chat velocity capture.
CREATE TABLE IF NOT EXISTS "ChatCapture" (
  id text PRIMARY KEY,
  "tenantId" text NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "broadcasterId" text NOT NULL,
  slug text NOT NULL,
  "chatroomId" text,
  status text NOT NULL DEFAULT 'QUEUED',
  "streamStartedAt" timestamptz NOT NULL,
  "endedAt" timestamptz,
  messages integer NOT NULL DEFAULT 0,
  error text,
  "claimedAt" timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ChatCapture_tenantId_idx" ON "ChatCapture"("tenantId");
CREATE INDEX IF NOT EXISTS "ChatCapture_status_idx" ON "ChatCapture"(status);

CREATE TABLE IF NOT EXISTS "ChatBucket" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "captureId" text NOT NULL REFERENCES "ChatCapture"(id) ON DELETE CASCADE,
  minute integer NOT NULL,
  counts integer[] NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatBucket_capture_minute_uniq" ON "ChatBucket"("captureId", minute);

-- Prevent duplicate live posts for the same clip+account (concurrent approve).
CREATE UNIQUE INDEX IF NOT EXISTS "Post_clip_account_live_uniq"
  ON "Post"("clipId", "accountId") WHERE status <> 'FAILED';
