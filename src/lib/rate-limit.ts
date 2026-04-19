/**
 * Simple in-memory rate limiter.
 *
 * Uses a sliding-window counter keyed by `<bucket>:<identifier>`. For a
 * production deployment on multi-instance hosting (Vercel), this should be
 * swapped for Upstash or a shared Redis — this implementation is a
 * pragmatic single-instance defence that makes credential stuffing
 * measurably harder and blocks trivial trial-abuse scripts.
 *
 * Not perfect (no distributed state), but it's a lot better than the zero
 * rate limiting we had before, and the API makes a future swap trivial.
 */

type Bucket = {
  /** Timestamps (ms) of hits inside the current window, oldest first. */
  hits: number[];
};

const store = new Map<string, Bucket>();

/**
 * Check-and-record. Returns `{ allowed, remaining, resetIn }`.
 * Intended usage:
 *
 *   const { allowed, retryAfter } = rateLimit('login', ip, { max: 5, window: 60_000 });
 *   if (!allowed) return tooMany(retryAfter);
 */
export function rateLimit(
  bucket: string,
  identifier: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; remaining: number; retryAfter: number } {
  const key = `${bucket}:${identifier}`;
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const entry = store.get(key) ?? { hits: [] };
  // Drop expired entries.
  entry.hits = entry.hits.filter((t) => t > windowStart);

  if (entry.hits.length >= opts.max) {
    // Compute retry-after in seconds from the oldest (earliest-to-expire) hit.
    const oldest = entry.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    store.set(key, entry);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - entry.hits.length),
    retryAfter: 0,
  };
}

/**
 * Best-effort client IP extraction. Vercel / most reverse proxies set
 * `x-forwarded-for`; falls back to `x-real-ip`, then to a constant so the
 * limiter degrades to "global" rather than failing open when headers are
 * stripped.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
