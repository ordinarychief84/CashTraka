import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { Err } from './errors';
import { ROLES } from './constants/roles';
import type { AccessRole } from './rbac';

/**
 * Authentication + session handling.
 *
 * A session principal is either:
 *   - an OWNER  (a row in the User table), or
 *   - a STAFF member (a StaffMember row whose accessRole is not "NONE").
 *
 * Both kinds share a single cookie shape: `{ kind, sub }`. All data access in
 * the app is scoped by OWNER user id — so when a staff principal is logged
 * in, we still resolve the owner User and expose that as the "owner" on the
 * returned context.
 *
 * Downstream code typically wants:
 *   - `owner` (User) — the tenant. Used to scope every prisma query.
 *   - `principal` — who's actually logged in (owner itself, or a staff row).
 *   - `accessRole` — OWNER | MANAGER | CASHIER | VIEWER.
 * `getCurrentUser()` is preserved for backward compatibility and returns the
 * owner (what existing callers expect).
 */

const SESSION_COOKIE = 'cashtraka_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (tighter for financial app)

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET env var is not set');
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type SessionKind = 'owner' | 'staff' | 'admin_staff';

type SessionPayload = {
  kind: SessionKind;
  sub: string;
};

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ kind: payload.kind, sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub as string | undefined;
    const kind = (payload.kind as SessionKind | undefined) ?? 'owner';
    if (!sub) return null;
    return { kind, sub };
  } catch {
    return null;
  }
}

export async function setOwnerSession(userId: string) {
  const token = await signSession({ kind: 'owner', sub: userId });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function setStaffSession(staffId: string) {
  const token = await signSession({ kind: 'staff', sub: staffId });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function setAdminStaffSession(adminStaffId: string) {
  const token = await signSession({ kind: 'admin_staff', sub: adminStaffId });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Back-compat — existing callers still call `setSessionCookie(userId)` after
 * a successful OWNER login. Routes it through the new encoded format.
 */
export async function setSessionCookie(userId: string) {
  await setOwnerSession(userId);
}

/** Back-compat signer used by a handful of legacy routes. */
export async function signSessionToken(userId: string): Promise<string> {
  return signSession({ kind: 'owner', sub: userId });
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const payload = await verifySession(token);
  // Legacy callers only knew about owners; return the sub only when it is one.
  return payload && payload.kind === 'owner' ? payload.sub : null;
}

export function clearSessionCookie() {
  // Match the attributes used when the cookie was set. Most browsers
  // delete cookies by matching name + path + domain, but some (older
  // Safari, some Android webviews) are stricter about sameSite/secure —
  // mirroring the original attributes guarantees the Set-Cookie
  // replacement actually unsets the session.
  cookies().set({
    name: SESSION_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
  });
}

export function readSessionTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Full session context. Resolves the cookie into an owner, optionally a
 * staff principal, and an access role. This is the single source of truth
 * for "who is acting in this request and on whose data".
 */
export type AuthContext = {
  owner: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
  /** Null when the principal is the owner themselves. */
  staff: Awaited<ReturnType<typeof prisma.staffMember.findUnique>> | null;
  accessRole: AccessRole;
  isOwner: boolean;
  principalName: string;
  principalId: string;
};

/** Resolve the current AuthContext from the session cookie, or null. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  if (payload.kind === 'owner') {
    const owner = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!owner) return null;
    return {
      owner,
      staff: null,
      accessRole: 'OWNER',
      isOwner: true,
      principalName: owner.name,
      principalId: owner.id,
    };
  }

  // kind === 'staff'
  const staff = await prisma.staffMember.findUnique({ where: { id: payload.sub } });
  if (!staff || staff.status !== 'active') return null;
  if (staff.accessRole === 'NONE' || !staff.passwordHash) return null;
  const owner = await prisma.user.findUnique({ where: { id: staff.userId } });
  if (!owner || owner.isSuspended) return null; // block staff if owner is suspended
  return {
    owner,
    staff,
    accessRole: staff.accessRole as AccessRole,
    isOwner: false,
    principalName: staff.name,
    principalId: staff.id,
  };
}

/**
 * Read current OWNER from the cookie store. For back-compat: returns the
 * OWNER user regardless of whether a staff is signed in. Callers scoping data
 * by `user.id` continue to behave correctly because data is always owner-scoped.
 *
 * IMPORTANT: also enforces suspension — a suspended owner returns null (which
 * downstream handlers treat as unauthorized). This closes the gap where ~36
 * routes called getCurrentUser() without separately checking isSuspended.
 */
export async function getCurrentUser() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  // Block suspended accounts at the lowest level so no handler can skip it.
  if (ctx.owner.isSuspended) return null;
  return ctx.owner;
}

/** Throws UNAUTHORIZED if no session, FORBIDDEN if owner is suspended. */
export async function requireUser() {
  const ctx = await getAuthContext();
  if (!ctx) throw Err.unauthorized();
  if (ctx.owner.isSuspended) throw Err.forbidden('This account is suspended. Contact support.');
  return ctx.owner;
}

/** Like `requireUser` but returns the full AuthContext. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw Err.unauthorized();
  if (ctx.owner.isSuspended) throw Err.forbidden('This account is suspended. Contact support.');
  return ctx;
}

/**
 * Enforce a permission on the currently-logged-in principal. Throws
 * FORBIDDEN (403) if they don't have it. Owners always pass.
 */
export async function requirePermission(
  action: import('./rbac').Permission,
): Promise<AuthContext> {
  const ctx = await requireAuth();
  const { can } = await import('./rbac');
  if (!can(ctx.accessRole, action)) {
    throw Err.forbidden(
      ctx.isOwner
        ? 'This action requires a higher permission level.'
        : 'Your team role does not allow this action.',
    );
  }
  return ctx;
}

/** Throws FORBIDDEN if the principal is not the platform admin (the User.role === ADMIN). */
export async function requireAdmin() {
  const ctx = await requireAuth();
  // Only an owner-kind principal can be an admin (staff can never be admin).
  if (!ctx.isOwner || ctx.owner.role !== ROLES.ADMIN) {
    throw Err.forbidden('Admin access required.');
  }
  return ctx.owner;
}

/**
 * Enforce per-business record ownership. Call with the record you just loaded
 * (which must expose a `userId` field) and the current user.
 */
export function requireBusinessAccess(
  resource: { userId: string } | null | undefined,
  user: { id: string; role: string },
): void {
  if (!resource) throw Err.notFound();
  if (user.role === ROLES.ADMIN) return;
  if (resource.userId !== user.id) throw Err.forbidden();
}

/**
 * Resolve admin staff from session cookie. Returns the AdminStaff record
 * or null if the session is not an admin_staff session.
 */
export async function getAdminStaffFromSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload || payload.kind !== 'admin_staff') return null;
  const adminStaff = await prisma.adminStaff.findUnique({
    where: { id: payload.sub },
  });
  if (!adminStaff || adminStaff.status !== 'active') return null;
  return adminStaff;
}

/**
 * Require admin access — either a SUPER_ADMIN (User.role === ADMIN) or an
 * AdminStaff with sufficient permissions. Returns info about who is logged in.
 */
export async function requireAdminOrStaff() {
  // First try: is this an admin_staff session?
  const adminStaff = await getAdminStaffFromSession();
  if (adminStaff) {
    return {
      kind: 'admin_staff' as const,
      id: adminStaff.id,
      name: adminStaff.name,
      email: adminStaff.email,
      adminRole: adminStaff.adminRole,
      isSuperAdmin: false,
    };
  }
  // Second try: is this a regular admin (User.role === ADMIN)?
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) throw Err.unauthorized();
  const payload = await verifySession(token);
  if (!payload || payload.kind !== 'owner') throw Err.unauthorized();
  const owner = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!owner || owner.role !== ROLES.ADMIN) throw Err.forbidden('Admin access required.');
  return {
    kind: 'super_admin' as const,
    id: owner.id,
    name: owner.name,
    email: owner.email,
    adminRole: 'SUPER_ADMIN',
    isSuperAdmin: true,
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
