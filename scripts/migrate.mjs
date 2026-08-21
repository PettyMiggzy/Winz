// Apply prisma/migrations.sql — the same additive, idempotent file the worker
// runs at boot.
//
// The web app and the worker deploy independently. Whichever ships first has to
// be able to create what its own code needs, or a Vercel build carrying a new
// column 500s the dashboard until the worker happens to catch up. Running the
// shared file on both sides removes the ordering entirely.
//
// This deliberately replaces `prisma db push`, which compares the whole schema
// and will happily propose dropping tables it doesn't recognise — it once tried
// to drop unrelated tables in this very database. The file this runs is
// additive-only by rule, so a build can add columns but never destroy one.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.log("[migrate] no DATABASE_URL — skipping (seed-fallback mode).");
  process.exit(0);
}

// DDL wants a direct (unpooled) connection; Neon's Vercel integration exposes
// one as DATABASE_URL_UNPOOLED. Falls back to the pooled URL.
const target = process.env.DATABASE_URL_UNPOOLED || url;

console.log("[migrate] applying prisma/migrations.sql…");
const res = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", "./prisma/migrations.sql", "--schema", "./prisma/schema.prisma"],
  { stdio: "inherit", shell: false, env: { ...process.env, DATABASE_URL: target } }
);

if (res.status !== 0) {
  console.error("[migrate] failed — the deploy is stopped rather than shipping code the database can't serve.");
  process.exit(res.status ?? 1);
}
console.log("[migrate] schema up to date.");
