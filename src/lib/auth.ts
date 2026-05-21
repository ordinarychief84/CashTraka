import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
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
/// Impersonation sessions are short-lived (1 hour). An admin who needs longer
/// access can re-impersonate. Keeps blast radius small if the admin walks away.
const IMPERSONATION_MAX_AGE = 60 * 60; // 1 hour

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

type SessionKind = 'owner' | 'staff' | 'admin_staff' | 'owner_impersonated';

/**
 * When `kind === 'owner_impersonated'`, `sub` is the target (impersonated)
 * user's id and `imp` carries the original admin so the "end impersonation"
 * action can restore them. Every state change made under this session is
 * tagged with `imp.aid` in the audit log so we know it wasn't the user.
 */
type ImpersonationClaim = {
  /** Admin id (User.id for super admin, AdminStaff.id for admin_staff). */
  aid: string;
  /** Which kind of admin to restore when impersonation ends. */
  akind: 'owner' | 'admin_staff';
  /** Unix ms when impersonation started. */
  ts: number;
};

type SessionPayload = {
  kind: SessionKind;
  sub: string;
  imp?: ImpersonationClaim;
};

async function signSession(payload: SessionPayload, maxAgeSeconds: number = SESSION_MAX_AGE): Promise<string> {
  const builder = new SignJWT({
    kind: payload.kind,
    sub: payload.sub,
    ...(payload.imp ? { imp: payload.imp } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`);
  return builder.sign(getSecret());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub as string | undefined;
    const kind = (payload.kind as SessionKind | undefined) ?? 'owner';
    if (!sub) return null;
    const imp = payload.imp as ImpersonationClaim | undefined;
    return { kind, sub, ...(imp ? { imp } : {}) };
  } catch {
    return null;
  }
}

export async function setOwnerSession(userId: string) {
  const token = await signSession({ kind: 'owner', sub: userId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function setStaffSession(staffId: string) {
  const token = await signSession({ kind: 'staff', sub: staffId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function setAdminStaffSession(adminStaffId: string) {
  const token = await signSession({ kind: 'admin_staff', sub: adminStaffId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Start an impersonation session. The cookie now scopes app access to the
 * target user (so the admin sees what the user sees), but `getAuthContext`
 * exposes the original admin id so the UI can render a banner and so every
 * action gets attributed to the admin in audit logs.
 *
 * Expires after 1 hour — the admin must re-impersonate for longer access.
 */
export async function setImpersonationSession(
  targetUserId: string,
  admin: { id: string; kind: 'owner' | 'admin_staff' },
) {
  const token = await signSession(
    {
      kind: 'owner_impersonated',
      sub: targetUserId,
      imp: { aid: admin.id, akind: admin.kind, ts: Date.now() },
    },
    IMPERSONATION_MAX_AGE,
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: IMPERSONATION_MAX_AGE,
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

export async function clearSessionCookie() {
  // Match the attributes used when the cookie was set. Most browsers
  // delete cookies by matching name + path + domain, but some (older
  // Safari, some Android webviews) are stricter about sameSite/secure —
  // mirroring the original attributes guarantees the Set-Cookie
  // replacement actually unsets the session.
  // Next 16: cookies() is async — await is required.
  const c = await cookies();
  c.set({
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
/**
 * Set when an admin is currently impersonating this owner. Downstream
 * audit-log calls pass `impersonation.adminId` as the actor so we know it
 * wasn't really the user, and the UI mounts a sitewide banner with an
 * "End impersonation" button.
 */
export type ImpersonationContext = {
  adminId: string;
  adminKind: 'owner' | 'admin_staff';
  startedAt: number;
};

export type AuthContext = {
  owner: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
  /** Null when the principal is the owner themselves. */
  staff: Awaited<ReturnType<typeof prisma.staffMember.findUnique>> | null;
  accessRole: AccessRole;
  isOwner: boolean;
  principalName: string;
  principalId: string;
  /** Null unless this session is an admin impersonating the owner. */
  impersonation: ImpersonationContext | null;
};

/**
 * Read the session JWT from the request. Web sessions live in the
 * `cashtraka_session` httpOnly cookie. The mobile React Native client
 * (which can't read httpOnly cookies) sends the same JWT in an
 * `Authorization: Bearer <token>` header instead. Cookie wins when both
 * are present so admin tabs that include the header by mistake don't
 * downgrade their session kind.
 */
// Next 16: cookies() and headers() are async; this helper follows.
async function readSessionFromRequest(): Promise<string | null> {
  const c = await cookies();
  const cookieToken = c.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  const h = await headers();
  const auth = h.get('authorization') || h.get('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Resolve the current AuthContext from the session cookie, or null. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const token = await readSessionFromRequest();
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  if (payload.kind === 'owner') {
    const owner = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Refuse soft-deleted users even if the session JWT is still
    // valid — the cleanup script flips `deletedAt` without clearing
    // sessions, so without this any leftover cookie would still
    // resolve to a "live" auth context.
    if (!owner || owner.deletedAt) return null;
    return {
      owner,
      staff: null,
      accessRole: 'OWNER',
      isOwner: true,
      principalName: owner.name,
      principalId: owner.id,
      impersonation: null,
    };
  }

  if (payload.kind === 'owner_impersonated') {
    // Validate that the impersonating admin is still allowed to do this. If
    // their admin account was revoked while impersonating, the session is
    // refused — we don't want a dangling impersonation to outlive the admin.
    if (!payload.imp) return null;
    const admin = await resolveImpersonatingAdmin(payload.imp);
    if (!admin) return null;
    const owner = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Mid-impersonation suspension or deletion of the target user must
    // immediately invalidate the impersonation session — otherwise the
    // banner keeps showing and partial reads of the target's data
    // succeed via `getAuthContext()`.
    if (!owner || owner.deletedAt || owner.isSuspended) return null;
    return {
      owner,
      staff: null,
      accessRole: 'OWNER',
      isOwner: true,
      principalName: owner.name,
      principalId: owner.id,
      impersonation: {
        adminId: payload.imp.aid,
        adminKind: payload.imp.akind,
        startedAt: payload.imp.ts,
      },
    };
  }

  // kind === 'staff'
  const staff = await prisma.staffMember.findUnique({ where: { id: payload.sub } });
  if (!staff || staff.status !== 'active') return null;
  if (staff.accessRole === 'NONE' || !staff.passwordHash) return null;
  const owner = await prisma.user.findUnique({ where: { id: staff.userId } });
  // Block staff when the owner tenant is suspended OR soft-deleted.
  if (!owner || owner.isSuspended || owner.deletedAt) return null;
  return {
    owner,
    staff,
    accessRole: staff.accessRole as AccessRole,
    isOwner: false,
    principalName: staff.name,
    principalId: staff.id,
    impersonation: null,
  };
}

/**
 * Confirm the admin embedded in an impersonation token is still a valid,
 * active admin. Returns the admin or null if the admin was deleted /
 * suspended / had their role revoked since impersonation started.
 */
async function resolveImpersonatingAdmin(imp: ImpersonationClaim) {
  if (imp.akind === 'owner') {
    const u = await prisma.user.findUnique({ where: { id: imp.aid } });
    if (!u || u.deletedAt || u.isSuspended) return null;
    if (u.role !== ROLES.ADMIN) return null;
    return { kind: 'owner' as const, id: u.id, name: u.name, email: u.email };
  }
  const s = await prisma.adminStaff.findUnique({ where: { id: imp.aid } });
  if (!s || s.status !== 'active') return null;
  return { kind: 'admin_staff' as const, id: s.id, name: s.name, email: s.email };
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
 *
 * Tenancy is the only check. Platform admins do NOT bypass tenancy here:
 * cross-tenant support reads must go through `/api/admin/*` routes which have
 * their own `requireAdmin` / `requireAdminOrStaff` gates and audit logging.
 * The previous admin short-circuit was effective god-mode on every record-by-id
 * route and has been removed.
 */
export function requireBusinessAccess(
  resource: { userId: string } | null | undefined,
  user: { id: string; role: string },
): void {
  if (!resource) throw Err.notFound();
  if (resource.userId !== user.id) throw Err.forbidden();
}

/**
 * Resolve admin staff from session cookie. Returns the AdminStaff record
 * or null if the session is not an admin_staff session.
 */
export async function getAdminStaffFromSession() {
  const token = await readSessionFromRequest();
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
  const token = await readSessionFromRequest();
  if (!token) throw Err.unauthorized();
  const payload = await verifySession(token);
  if (!payload || payload.kind !== 'owner') throw Err.unauthorized();
  const owner = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!owner || owner.deletedAt || owner.role !== ROLES.ADMIN) {
    throw Err.forbidden('Admin access required.');
  }
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
