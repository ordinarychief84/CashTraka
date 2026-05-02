import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

/**
 * Logout.
 *
 * Accepts both an HTML `<form method="post">` submit (the nav buttons in
 * AppShell + AdminShell) and a `fetch('/api/auth/logout', { method: 'POST' })`
 * call (SettingsForm). We always clear the session cookie, then:
 *   - For browser form submits, we 303-redirect to /login so the user lands
 *     on a real page instead of seeing the raw JSON response.
 *   - `fetch` callers silently follow the redirect. Since SettingsForm's
 *     handler doesn't read the body and calls router.push() afterwards,
 *     this is backward-compatible.
 *
 * GET is also accepted so direct navigation to /api/auth/logout (e.g. when
 * someone pastes the URL or a browser prefetches the form action) behaves
 * the same way.
 */
function buildLogoutResponse(req: Request) {
  // Derive the origin from the REQUEST's Host header, not from req.url.
  // When the dev server is bound to a non-loopback interface (e.g.
  // `next dev -H 0.0.0.0` for LAN testing), req.url ends up as
  // http://0.0.0.0:3001/... and the redirect becomes unreachable from
  // the actual client. The Host header reflects the address the client
  // used to reach us, which is always the right target.
  const reqUrl = new URL(req.url);
  const host = req.headers.get('host') || reqUrl.host;
  const proto =
    req.headers.get('x-forwarded-proto') ||
    reqUrl.protocol.replace(':', '') ||
    'http';
  const res = NextResponse.redirect(`${proto}://${host}/login`, { status: 303 });
  // Clear the cookie on the outbound headers too (belt-and-braces with the
  // cookies() mutation above), so the cookie is gone BEFORE the browser
  // follows the redirect and lands on /login.
  res.cookies.set({
    name: 'cashtraka_session',
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function POST(req: Request) {
  clearSessionCookie();
  return buildLogoutResponse(req);
}

export async function GET(req: Request) {
  clearSessionCookie();
  return buildLogoutResponse(req);
}
