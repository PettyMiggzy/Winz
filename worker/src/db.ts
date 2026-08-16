/** Shared Postgres client for the worker (clip poller + publish poller). */
import postgres from "postgres";

// prepare:false — Neon's pooled endpoint (PgBouncer) rejects named prepared
// statements. Works against either the pooled or the direct connection string.
// onnotice — drop server NOTICEs (e.g. idempotent ALTERs) from the logs.
export const sql = postgres(process.env.DATABASE_URL ?? "", {
  max: 6,
  prepare: false,
  onnotice: () => {},
});
