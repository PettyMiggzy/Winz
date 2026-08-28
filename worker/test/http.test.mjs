// Retry policy. The distinction that matters: "same request, later" (429/5xx)
// versus "this request is wrong" (4xx). Getting it backwards is how a job that
// already cost a 25 GB download dies on a rate limit, and how an over-long
// prompt gets retried by being made longer.
import { HttpError, isRetryable, retryAfterMs, withRetry } from "../engine/http.ts";

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

// --- classification ---
ok("429 is retryable", isRetryable(new HttpError(429, "slow down")));
ok("500 is retryable", isRetryable(new HttpError(500, "oops")));
ok("503 is retryable", isRetryable(new HttpError(503, "unavailable")));
ok("400 is NOT retryable", isRetryable(new HttpError(400, "context too long")) === false);
ok("413 is NOT retryable", isRetryable(new HttpError(413, "payload too large")) === false);
ok("401 is NOT retryable", isRetryable(new HttpError(401, "bad key")) === false);
ok("404 is NOT retryable", isRetryable(new HttpError(404, "no such model")) === false);
// A socket hang-up is transient; a malformed JSON body is not.
ok("a network error is retryable", isRetryable(new Error("socket hang up")));
ok("a JSON parse error is NOT retryable", isRetryable(new SyntaxError("Unexpected token")) === false);

// --- Retry-After parsing ---
const hdr = (v) => new Response("", { headers: v ? { "retry-after": v } : {} });
ok("reads a delta-seconds Retry-After", retryAfterMs(hdr("30")) === 30_000);
ok("treats 0 seconds as zero, not missing", retryAfterMs(hdr("0")) === 0);
ok("no header means no hint", retryAfterMs(hdr(null)) === null);
ok("garbage header means no hint", retryAfterMs(hdr("soon")) === null);

// --- the loop ---
let calls = 0;
const recovered = await withRetry(async () => {
  calls += 1;
  if (calls < 3) throw new HttpError(429, "rate limited");
  return "ok";
}, { attempts: 4, baseMs: 1, label: "test" });
ok("retries through a rate limit and succeeds", recovered === "ok" && calls === 3);

calls = 0;
let threw = null;
try {
  await withRetry(async () => { calls += 1; throw new HttpError(400, "too long"); }, { attempts: 4, baseMs: 1 });
} catch (e) { threw = e; }
ok("a 400 fails on the first attempt", calls === 1);
ok("and the original error survives", threw instanceof HttpError && threw.status === 400);

calls = 0;
try {
  await withRetry(async () => { calls += 1; throw new HttpError(500, "down"); }, { attempts: 3, baseMs: 1 });
} catch { /* expected */ }
ok("gives up after the attempt budget", calls === 3);

calls = 0;
const first = await withRetry(async () => { calls += 1; return "immediate"; }, { baseMs: 1 });
ok("a success costs exactly one call", first === "immediate" && calls === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
