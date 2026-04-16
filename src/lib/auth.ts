import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { Err } from './errors';
import { ROLES } from './constants/roles';

const SESSION_COOKIE = 'cashtraka_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET env var is not set');
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await signSessionToken(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}

export function readSessionTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Read current user from the cookie store (Server Component / Route Handler). */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Throws UNAUTHORIZED if no user, FORBIDDEN if suspended. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw Err.unauthorized();
  if (user.isSuspended) throw Err.forbidden('Your account is suspended. Contact support.');
  return user;
}

/** Throws FORBIDDEN if the user is not an admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) throw Err.forbidden('Admin access required.');
  return user;
}

/**
 * Enforce per-business record ownership. Call with the record you just loaded
 * (which must expose a `userId` field) and the current user.
 *
 *   const debt = await prisma.debt.findUnique({ where: { id } });
 *   requireBusinessAccess(debt, user);
 */
export function requireBusinessAccess(
  resource: { userId: string } | null | undefined,
  user: { id: string; role: string },
): void {
  if (!resource) throw Err.notFound();
  // Admins can access any record.
  if (user.role === ROLES.ADMIN) return;
  if (resource.userId !== user.id) throw Err.forbidden();
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
