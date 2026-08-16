import crypto from "node:crypto";
import { getPrisma } from "@/server/db";

/**
 * Developer API keys. Format: wcz_<40 hex chars>. Only the sha256 is stored —
 * the raw key is shown once at creation. Keys authenticate the v1 REST API
 * (Authorization: Bearer wcz_…) and scope every call to the owning workspace.
 */

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function createApiKey(
  tenantId: string,
  name: string
): Promise<{ id: string; key: string }> {
  const prisma = getPrisma()!;
  const key = `wcz_${crypto.randomBytes(20).toString("hex")}`;
  const row = await prisma.apiKey.create({
    data: { tenantId, name: name.slice(0, 60) || "API key", keyHash: sha256(key) },
  });
  return { id: row.id, key };
}

/** Resolve a bearer key to its tenant; bumps lastUsedAt. Null if invalid. */
export async function tenantForApiKey(authorization: string | null): Promise<string | null> {
  const prisma = getPrisma();
  if (!prisma || !authorization) return null;
  const m = authorization.match(/^Bearer\s+(wcz_[a-f0-9]{40})$/i);
  if (!m) return null;
  const row = await prisma.apiKey.findUnique({ where: { keyHash: sha256(m[1]) } });
  if (!row) return null;
  // Fire-and-forget usage stamp; a failure here must not fail the request.
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return row.tenantId;
}
