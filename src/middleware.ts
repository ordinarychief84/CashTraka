import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'cashtraka_session';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/onboarding',
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
  // Admin — role check is enforced inside each page/route via requireAdmin().
  '/admin',
];

const AUTH_PAGES = ['/login', '/signup'];

async function verify(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
