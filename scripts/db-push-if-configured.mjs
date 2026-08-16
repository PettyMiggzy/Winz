// Runs `prisma db push` ONLY when a database is configured.
// - No DATABASE_URL (seed-fallback / preview builds): skip, build proceeds normally.
// - DATABASE_URL set (real deploy): create/patch tables from prisma/schema.prisma.
// db push is idempotent — on later deploys with no schema changes it's a fast no-op.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.log("[db-push] no DATABASE_URL — skipping (seed-fallback mode).");
  process.exit(0);
}

// `prisma db push` runs DDL, which wants a DIRECT (unpooled) connection. Neon's
// Vercel integration exposes that as DATABASE_URL_UNPOOLED — prefer it so the
// push doesn't fail against the PgBouncer pooler. Falls back to DATABASE_URL.
const pushUrl = process.env.DATABASE_URL_UNPOOLED || url;

console.log("[db-push] DATABASE_URL found — syncing tables from schema…");
// No --accept-data-loss: db push applies additive changes without prompting and
// errors out (safe) rather than dropping columns that would lose data.
const res = spawnSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate"],
  { stdio: "inherit", shell: false, env: { ...process.env, DATABASE_URL: pushUrl } }
);

if (res.status !== 0) {
  console.error("[db-push] prisma db push failed.");
  process.exit(res.status ?? 1);
}
console.log("[db-push] tables in sync.");
