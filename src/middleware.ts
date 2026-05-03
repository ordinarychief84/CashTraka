import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const SESSION_COOKIE = 'cashtraka_session';

/* Global API rate limiter. Uses Upstash when configured, in-memory otherwise. */
const API_RATE_WINDOW_MS = 60_000; // 1 minute
const API_RATE_MAX = 120;          // 120 requests per minute per IP
const apiHits = new Map<string, number[]>();

let globalLimiter: Ratelimit | null = null;
let globalLimiterChecked = false;
function getGlobalLimiter(): Ratelimit | null {
  if (globalLimiterChecked) return globalLimiter;
  globalLimiterChecked = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  globalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(API_RATE_MAX, `${API_RATE_WINDOW_MS / 1000} s`),
    prefix: 'ct:rl:global-api',
    analytics: false,
  });
  return globalLimiter;
}

function inMemoryGlobalRate(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - API_RATE_WINDOW_MS;
  const hits = (apiHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= API_RATE_MAX) {
    const oldest = hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + API_RATE_WINDOW_MS - now) / 1000));
    apiHits.set(ip, hits);
    return { ok: false, retryAfter };
  }
  hits.push(now);
  apiHits.set(ip, hits);
  // Periodic cleanup — drop stale IPs every ~500 requests
  if (apiHits.size > 5000) {
    for (const [k, v] of apiHits) {
      if (v.every((t) => t <= cutoff)) apiHits.delete(k);
    }
  }
  return { ok: true, retryAfter: 0 };
}

async function globalRateOk(ip: string): Promise<{ ok: boolean; retryAfter: number }> {
  const limiter = getGlobalLimiter();
  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      if (result.success) return { ok: true, retryAfter: 0 };
      const now = Date.now();
      const retryAfter = Math.max(1, Math.ceil((result.reset - now) / 1000));
      return { ok: false, retryAfter };
    } catch {
      // Upstash unreachable, fall back to in-memory rather than failing open.
      return inMemoryGlobalRate(ip);
    }
  }
  return inMemoryGlobalRate(ip);
}

function extractIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/* ── Request body size guard (1 MB max for API routes) ─────────── */
const MAX_BODY_BYTES = 1_048_576; // 1 MB

/**
 * Routes that legitimately receive larger bodies (multipart image uploads).
 * Each of these enforces its OWN per-file + per-request cap inside the
 * handler, so we skip the global body-size check for them.
 */
const LARGE_BODY_PREFIXES = [
  '/api/showroom/upload', // catalog + album image upload, 5 MB × 8 = 40 MB
  '/api/settings/logo',   // logo upload, 2 MB
];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/verify-email',
  '/payments',
  '/debts',
  '/customers',
  '/follow-up',
  '/settings',
  '/search',
  '/expenses',
  '/products',
  '/sales',
  '/showroom',
  '/receipts',
  '/reports',
  '/templates',
  '/invoices',
  '/reminders',
  '/properties',
  '/tenants',
  '/rent',
  '/tasks',
  '/checklists',
  '/team',
  '/paylinks',
  '/collections',
  '/promises',
  '/billing',
  '/service-check',
  // Admin — role check is enforced inside each page/route via requireAdmin().
  '/admin',
];

const AUTH_PAGES = ['/login', '/signup'];

async function verify(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const raw = process.env.AUTH_SECRET;
  // CRITICAL: never fall back to '' — that makes forged sessions trivial.
  if (!raw) return null;
  try {
    const secret = new TextEncoder().encode(raw);
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

/**
 * CSRF defence via Origin / Referer header check.
 *
 * We rely on SameSite=Lax cookies for session storage, but that alone
 * doesn't block top-level form POSTs from a malicious third-party site.
 * This additional check guarantees that any state-changing API request
 * (non-GET on /api/*) must come from the same origin that served the
 * page — closing off the classic CSRF attack vector without requiring
 * a double-submit token scheme.
 *
 * Exemptions:
 *   - /api/billing/webhook — Paystack's server calls us cross-origin
 *     with no Origin header. Signature verification protects it.
 *   - /api/payments/claim/* — public "customer paid me" endpoint,
 *     intentionally origin-free.
 *   - /api/pay/* — public PayLink confirmation endpoint.
 *   - /api/cron/* — Vercel cron jobs, no browser origin.
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/billing/webhook',
  '/api/payments/claim/',
  '/api/pay/',
  '/api/cron/',
  // Public storefront — unauthenticated browsers click "Order on WhatsApp"
  // and POST to /api/store/[slug]/order. Per-IP rate limit lives inside the
  // route handler (CATALOG_LIMITS.ORDER_RATE_PER_MIN, default 30/min).
  '/api/store/',
  // One-shot maintenance endpoints called server-to-server with CRON_SECRET.
  '/api/cleanup-broken-uploads',
  '/api/migrate',
  // Public Service Check submission — customer's browser POSTs from a link
  // they opened in WhatsApp, often cross-origin. Per-IP rate limit lives
  // inside the route handler.
  '/api/public/feedback',
];

function sameOriginOk(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  if (!host) return false;
  // Trusted matcher: the request host must match the Origin header's host.
  const sourceHost = origin
    ? safeHost(origin)
    : referer
      ? safeHost(referer)
      : null;
  // Allow missing headers only for server-to-server / curl-without-origin
  // calls — but those get through SameSite so we explicitly deny.
  if (!sourceHost) return false;
  return sourceHost === host;
}

function safeHost(u: string): string | null {
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const method = req.method.toUpperCase();
  const isStateChanging = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  // ── Global API rate limit — 120 req/min per IP ──
  if (isApi) {
    const ip = extractIp(req);
    const rl = await globalRateOk(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfter) },
        },
      );
    }
  }

  // ── Request body size guard, reject oversized payloads ──
  // Upload endpoints in LARGE_BODY_PREFIXES enforce their own caps inside
  // the route handler, so we skip the global check for those.
  const isUploadRoute = LARGE_BODY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isApi && isStateChanging && !isUploadRoute) {
    const cl = req.headers.get('content-length');
    if (cl && parseInt(cl, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Request body too large.' },
        { status: 413 },
      );
    }
  }

  // ── CSRF check — any state-changing /api/* call must be same-origin ──
  const isCsrfExempt = CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
  if (isApi && isStateChanging && !isCsrfExempt && !sameOriginOk(req)) {
    return NextResponse.json(
      { success: false, error: 'Blocked: cross-origin request rejected.' },
      { status: 403 },
    );
  }

  // ── Session-based route gating (unchanged behaviour) ──
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verify(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Include /api/* so the CSRF origin check can fire on state-changing
  // calls. The old matcher excluded /api entirely, leaving the origin
  // check dead code. We still skip Next internals + static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon\\.svg|icon-.*\\.png|apple-touch-icon\\.png|manifest\\.webmanifest|logo\\.svg|sw\\.js).*)',
  ],
};
