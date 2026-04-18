import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'cashtraka_session';

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

  // ── CSRF check — any state-changing /api/* call must be same-origin ──
  const method = req.method.toUpperCase();
  const isStateChanging = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  const isApi = pathname.startsWith('/api/');
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
