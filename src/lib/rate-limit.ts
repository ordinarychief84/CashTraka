/**
 * Shared rate limiter.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * uses Upstash sliding-window. Counters survive across Vercel isolates.
 * When unset (local dev), falls back to an in-memory Map. Local dev
 * works without Upstash; production must have it configured.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Bucket = {
  /** Timestamps (ms) of hits inside the current window, oldest first. */
  hits: number[];
};

const memStore = new Map<string, Bucket>();

/** Cache of `Ratelimit` instances keyed by `<bucket>:<max>:<windowMs>`. */
const upstashCache = new Map<string, Ratelimit>();

/** Lazy singleton for the Upstash Redis client. */
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

function getOrCreateLimiter(
  bucket: string,
  opts: { max: number; windowMs: number },
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${bucket}:${opts.max}:${opts.windowMs}`;
  const cached = upstashCache.get(cacheKey);
  if (cached) return cached;

  const windowSeconds = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.max, `${windowSeconds} s`),
    prefix: `ct:rl:${bucket}`,
    analytics: false,
  });
  upstashCache.set(cacheKey, limiter);
  return limiter;
}

function inMemoryRateLimit(
  bucket: string,
  identifier: string,
  opts: { max: number; windowMs: number },
): { allowed: boolean; remaining: number; retryAfter: number } {
  const key = `${bucket}:${identifier}`;
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  const entry = memStore.get(key) ?? { hits: [] };
  // Drop expired entries.
  entry.hits = entry.hits.filter((t) => t > windowStart);

  if (entry.hits.length >= opts.max) {
    // Compute retry-after in seconds from the oldest (earliest-to-expire) hit.
    const oldest = entry.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    memStore.set(key, entry);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.hits.push(now);
  memStore.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - entry.hits.length),
    retryAfter: 0,
  };
}

/**
 * Check-and-record. Returns `{ allowed, remaining, retryAfter }`.
 * Intended usage:
 *
 *   const { allowed, retryAfter } = rateLimit('login', ip, { max: 5, windowMs: 60_000 });
 *   if (!allowed) return tooMany(retryAfter);
 *
 * Picks Upstash when configured, otherwise the in-memory implementation.
 * Async because Upstash is network-bound; the in-memory branch resolves
 * synchronously inside the returned promise.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  opts: { max: number; windowMs: number },
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const limiter = getOrCreateLimiter(bucket, opts);
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      const now = Date.now();
      const retryAfter = result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - now) / 1000));
      return {
        allowed: result.success,
        remaining: Math.max(0, result.remaining),
        retryAfter,
      };
    } catch {
      // If Upstash is unreachable, fall through to in-memory so we don't
      // hard-fail the request path. Better to let traffic through with a
      // weaker per-isolate counter than to 500 every endpoint.
      return inMemoryRateLimit(bucket, identifier, opts);
    }
  }
  return inMemoryRateLimit(bucket, identifier, opts);
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
