import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 (S3-compatible) helpers. We only need presigned PUT URLs — the
 * browser uploads the video straight to R2 (Vercel's 4.5MB body limit rules out
 * proxying), and the worker later fetches the public URL. Uses aws4fetch (tiny,
 * edge-friendly SigV4) instead of the full AWS SDK.
 */

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

/** Presign a PUT the browser can upload to directly. Expires in `expiresSec`. */
export async function presignPut(key: string, contentType: string, expiresSec = 3600): Promise<string> {
  const signed = await client().sign(
    new Request(endpoint(key), { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true }, ...({ expires: expiresSec } as Record<string, unknown>) }
  );
  return signed.url;
}

/** Public URL the worker fetches (needs a public bucket or custom domain). */
export function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  return base ? `${base.replace(/\/$/, "")}/${key}` : endpoint(key);
}
