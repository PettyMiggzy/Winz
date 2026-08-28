/**
 * Shared HTTP retry policy for the hosted APIs the engine depends on.
 *
 * The distinction that matters: a 429 or 5xx means "same request, later" and is
 * worth retrying, while a 4xx means "this request is wrong" and never is.
 * Conflating them is how a job that already cost a 25 GB download gets thrown
 * away on a rate limit — and how an over-long prompt gets "retried" by being
 * made longer.
 */

export class HttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = 'HttpError';
  }
}

/** 429 and 5xx are transient. Everything else is a bug in the request. */
export function isRetryable(e: unknown): boolean {
  if (e instanceof HttpError) return e.status === 429 || e.status >= 500;
  // Network-level failures (socket hang up, DNS, timeouts) are transient too.
  return e instanceof Error && !(e instanceof SyntaxError);
}

/** Seconds from a Retry-After header, honouring both the delta and date forms. */
export function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get('retry-after');
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

export interface RetryOpts {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  label?: string;
}

/**
 * Retry a request with exponential backoff. `fn` receives the attempt index so
 * it can log; a thrown HttpError carrying a Retry-After overrides the backoff.
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const { attempts = 4, baseMs = 2000, maxMs = 60_000, label = 'request' } = opts;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
      if (!isRetryable(e) || i === attempts - 1) throw e;
      const hinted = e instanceof HttpError ? (e as HttpError & { retryAfterMs?: number }).retryAfterMs : undefined;
      const wait = Math.min(maxMs, hinted ?? baseMs * 2 ** i);
      console.warn(`[${label}] attempt ${i + 1}/${attempts} failed (${(e as Error).message}) — retrying in ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}
