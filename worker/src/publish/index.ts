/**
 * Publish adapters. Launch via a third-party posting API (Blotato) whose app is
 * already audited, then swap to official adapters as our TikTok/YouTube audits
 * clear — the interface stays identical (docs/research/02-04, 14).
 */

import type { Platform } from "../types.js";

export interface PublishTarget {
  platform: Platform;
  accountId: string;
  accessToken: string;
}

export interface PublishMeta {
  title: string;
  caption: string;
}

export interface PublishResult {
  externalId?: string;
  url?: string;
}

export interface PublishAdapter {
  platform: Platform | "blotato";
  publish(clipPath: string, meta: PublishMeta, target: PublishTarget): Promise<PublishResult>;
}

// TODO: implement adapters:
//  - instagram.ts  (Graph API: create REELS container from public R2 URL → poll → publish)
//  - blotato.ts    (bridge TikTok + YouTube until our own audits pass)
//  - tiktok.ts / youtube.ts (official, post-audit)
