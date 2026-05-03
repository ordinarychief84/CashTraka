import { prisma } from '@/lib/prisma';
import {
  setOwnerSession,
  setStaffSession,
  setAdminStaffSession,
  verifyPassword,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { ok, fail, unauthorized, forbidden, validationFail } from '@/lib/api-response';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { securityLog } from '@/lib/security-log';

/**
 * Unified login.
 *
 * Tries the User table first (owners) and falls back to StaffMember. Staff
 * can only log in once their invite is accepted (passwordHash is set) AND
 * their accessRole is not "NONE".
 *
 * Returns the same shape regardless of principal kind so the client can
 * redirect without branching, except `kind` is included so you can tell
 * them apart server-side in tests.
 */
export async function POST(req: Request) {
  try {
    // Rate limit — 10 attempts per IP per 10 minutes blocks online credential
    // stuffing without hurting legit users who mistyped their password.
    const ip = clientIp(req);
    const limited = await rateLimit('login', ip, { max: 10, windowMs: 10 * 60_000 });
    if (!limited.allowed) {
      return fail(
        `Too many attempts. Try again in ${limited.retryAfter}s.`,
        429,
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const { email, password } = parsed.data;

    // Account lockout — 5 attempts per email per 30 minutes. This is the
    // primary defence against targeted credential attacks even when the
    // attacker rotates IPs. Tighter than the per-IP limit.
    const byEmail = await rateLimit('login-email', email.toLowerCase(), {
      max: 5,
      windowMs: 30 * 60_000,
    });
    if (!byEmail.allowed) {
      return fail(
        `Account temporarily locked due to too many failed attempts. Try again in ${Math.ceil(byEmail.retryAfter / 60)} min.`,
        429,
      );
    }

    // 1) Owner path — existing behaviour.
    const owner = await prisma.user.findUnique({ where: { email } });
    if (owner && (await verifyPassword(password, owner.passwordHash))) {
      if (owner.isSuspended) {
        securityLog({ event: 'LOGIN_FAILED', actorId: owner.id, ip, meta: { reason: 'suspended' } });
        return forbidden('Your account is suspended. Contact support.');
      }
      await prisma.user.update({ where: { id: owner.id }, data: { lastLoginAt: new Date() } });
      await setOwnerSession(owner.id);
      securityLog({ event: 'LOGIN_SUCCESS', actorId: owner.id, ip, meta: { kind: 'owner' } });
      return ok({
        kind: 'owner',
        id: owner.id,
        email: owner.email,
        role: owner.role,
        businessType: owner.businessType,
      });
    }

    // 2) Staff path — search for an active staff with a password hash
    //    matching this email. We normalise across all owners, but the
    //    (userId, email) unique index still lets multiple owners have a
    //    staff with the same email.
    const candidates = await prisma.staffMember.findMany({
      where: {
        email,
        status: 'active',
        passwordHash: { not: null },
        accessRole: { not: 'NONE' },
      },
      take: 5,
    });
    for (const staff of candidates) {
      if (!staff.passwordHash) continue;
      const matches = await verifyPassword(password, staff.passwordHash);
      if (!matches) continue;
      // Verify the owner is also in good standing — a suspended owner
      // means their staff can't get in either.
      const ownerAcct = await prisma.user.findUnique({ where: { id: staff.userId } });
      if (!ownerAcct || ownerAcct.isSuspended) {
        return forbidden("This business's account is suspended. Contact the owner.");
      }
      await prisma.staffMember.update({
        where: { id: staff.id },
        data: { lastLoginAt: new Date() },
      });
      await setStaffSession(staff.id);
      securityLog({ event: 'LOGIN_SUCCESS', actorId: staff.id, targetId: staff.userId, ip, meta: { kind: 'staff' } });
      return ok({
        kind: 'staff',
        id: staff.id,
        email: staff.email,
        accessRole: staff.accessRole,
        businessType: ownerAcct.businessType,
      });
    }

    // 3) Admin staff path — platform staff with assigned roles
    const adminStaff = await prisma.adminStaff.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      adminStaff &&
      adminStaff.status === 'active' &&
      adminStaff.passwordHash &&
      (await verifyPassword(password, adminStaff.passwordHash))
    ) {
      await prisma.adminStaff.update({
        where: { id: adminStaff.id },
        data: { lastLoginAt: new Date() },
      });
      await setAdminStaffSession(adminStaff.id);
      return ok({
        kind: 'admin_staff',
        id: adminStaff.id,
        email: adminStaff.email,
        adminRole: adminStaff.adminRole,
        redirectTo: '/admin/dashboard',
      });
    }

    securityLog({ event: 'LOGIN_FAILED', ip, meta: { email: email.toLowerCase() } });
    return unauthorized('Invalid email or password');
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error(e);
    return fail('Server error', 500);
  }
}
