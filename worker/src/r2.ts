/**
 * R2 upload for the worker: pushes each rendered clip to Cloudflare R2 so it's
 * durable and web-servable (the worker's local disk is ephemeral). Mirrors the
 * web app's src/server/r2.ts — same SigV4 via aws4fetch, no AWS SDK.
 */
import { readFile } from "node:fs/promises";
import { AwsClient } from "aws4fetch";

export const r2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
);

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
}

function endpoint(key: string): string {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
}

/** Upload a local file to R2 under `key`. Returns the key on success. */
export async function uploadFile(key: string, localPath: string, contentType = "video/mp4"): Promise<string> {
  const body = await readFile(localPath);
  const res = await client().fetch(endpoint(key), {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    throw new Error(`R2 upload ${res.status} ${res.statusText} for ${key}`);
  }
  return key;
}
