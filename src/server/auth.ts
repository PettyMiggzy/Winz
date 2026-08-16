import { cache } from "react";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/server/db";

/**
 * Session auth for WinClipz. Email+password (bcrypt), sessions in Postgres,
 * HttpOnly cookie carries a random token whose sha256 is stored — a DB leak
 * alone can't hijack a session. In seed mode (no DATABASE_URL) there is no
 * auth: the app is a public demo with seed data.
 *
 * Tenanting: signing up creates a fresh workspace (tenant, plan FREE) — unless
 * the email is listed in ADMIN_EMAILS, in which case the user attaches to the
 * founding WinslowBankz workspace with plan ADMIN (unlimited).
 */

const COOKIE = "winclipz_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  tenantName: string;
  plan: string;
  kickSlug: string | null;
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Current user, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const prisma = getPrisma();
  if (!prisma) return null; // seed/demo mode — no auth
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { tenant: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    tenantId: u.tenantId,
    tenantName: u.tenant.name,
    plan: u.tenant.plan,
    kickSlug: u.tenant.kickSlug,
  };
});

/** Tenant id for data scoping; null in seed mode or when logged out. */
export async function getSessionTenantId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.tenantId ?? null;
}

async function issueSession(userId: string): Promise<void> {
  const prisma = getPrisma()!;
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = getPrisma();
  if (!prisma) return { ok: false, error: "demo mode — no database configured" };
  const normEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) return { ok: false, error: "enter a valid email" };
  if (password.length < 8) return { ok: false, error: "password must be at least 8 characters" };

  const existing = await prisma.user.findUnique({ where: { email: normEmail } });
  if (existing) return { ok: false, error: "that email already has an account — sign in instead" };

  const isAdmin = adminEmails().includes(normEmail);
  const passwordHash = await bcrypt.hash(password, 11);

  const user = await prisma.$transaction(async (tx) => {
    const tenant = isAdmin
      ? await tx.tenant.upsert({
          where: { kickSlug: "winslowbankz" },
          update: { plan: "ADMIN" },
          create: { name: "WinslowBankz", kickSlug: "winslowbankz", plan: "ADMIN" },
        })
      : await tx.tenant.create({
          data: { name: name?.trim() || normEmail.split("@")[0], plan: "FREE" },
        });
    return tx.user.create({
      data: { tenantId: tenant.id, email: normEmail, name: name?.trim() || null, passwordHash },
    });
  });

  await issueSession(user.id);
  return { ok: true };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = getPrisma();
  if (!prisma) return { ok: false, error: "demo mode — no database configured" };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Same error for unknown email and wrong password — no account enumeration.
  if (!user?.passwordHash) return { ok: false, error: "wrong email or password" };
  const good = await bcrypt.compare(password, user.passwordHash);
  if (!good) return { ok: false, error: "wrong email or password" };
  await issueSession(user.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const prisma = getPrisma();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (prisma && token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  jar.delete(COOKIE);
}
