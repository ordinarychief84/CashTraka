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
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(`${origin}/login`, { status: 303 });
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
