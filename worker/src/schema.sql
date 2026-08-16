-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TIKTOK', 'YOUTUBE', 'INSTAGRAM', 'KICK');

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('MAIN', 'CLIPS');

-- CreateEnum
CREATE TYPE "WarmupState" AS ENUM ('NEW', 'WARMING', 'READY');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('LIVE', 'UPLOADING', 'QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('PENDING', 'APPROVED', 'SCHEDULED', 'POSTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('SCHEDULED', 'POSTING', 'POSTED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kickSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'MAIN',
    "handle" TEXT NOT NULL,
    "externalId" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "warmupState" "WarmupState" NOT NULL DEFAULT 'NEW',
    "connectedAt" TIMESTAMP(3),
    "followers" INTEGER,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kickVideoId" TEXT,
    "title" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'LIVE',
    "sourceKey" TEXT,
    "sourceUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "momentsDetected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "durationSec" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "signal" TEXT,
    "status" "ClipStatus" NOT NULL DEFAULT 'PENDING',
    "assignedPlatform" "Platform",
    "flaggedMusic" BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "externalUrl" TEXT,
    "views" INTEGER,
    "likes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_kickSlug_key" ON "Tenant"("kickSlug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "SocialAccount_tenantId_idx" ON "SocialAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_tenantId_platform_handle_key" ON "SocialAccount"("tenantId", "platform", "handle");

-- CreateIndex
CREATE INDEX "Stream_tenantId_idx" ON "Stream"("tenantId");

-- CreateIndex
CREATE INDEX "Clip_tenantId_status_idx" ON "Clip"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Clip_streamId_idx" ON "Clip"("streamId");

-- CreateIndex
CREATE INDEX "Post_tenantId_idx" ON "Post"("tenantId");

-- CreateIndex
CREATE INDEX "Post_clipId_idx" ON "Post"("clipId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_messageId_key" ON "WebhookEvent"("messageId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

