import { PrismaClient } from "@prisma/client";

/**
 * Lazy Prisma client. We only construct it when DATABASE_URL is configured, so
 * the app builds and runs with zero external dependencies (falling back to seed
 * data). Add DATABASE_URL + run `npm run db:push` to switch to a real database.
 */
declare global {
  // eslint-disable-next-line no-var
  var __winzPrisma: PrismaClient | undefined;
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function getPrisma(): PrismaClient | null {
  if (!hasDatabase) return null;
  if (!global.__winzPrisma) {
    global.__winzPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return global.__winzPrisma;
}
