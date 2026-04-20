import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { can, ASSIGNABLE_ROLES, type AccessRole } from '@/lib/rbac';
import { handled, ok, fail, forbidden, validationFail } from '@/lib/api-response';
import { emailService } from '@/lib/services/email.service';
import { securityLog } from '@/lib/security-log';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email('Enter a valid email').toLowerCase(),
  accessRole: z.enum(['MANAGER', 'CASHIER', 'VIEWER']),
  customRoleId: z.string().optional().nullable(),
});

/**
 * POST /api/team/[id]/invite
 *
 * Generate a new invite for an existing staff member.
 *   - Requires the caller has `team.invite` permission (owner-only by default).
 *   - Sets the staff's email + accessRole + a fresh inviteToken (expires in 7d).
 *   - Returns the acceptance URL the owner should share via WhatsApp/email.
 *
 * Idempotent: calling again just rotates the token and clears any existing
 * passwordHash — useful for "resend invite" after a lost link.
 */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    if (!can(auth.accessRole, 'team.invite')) {
      return forbidden('Only the account owner can invite team members.');
    }

    const member = await prisma.staffMember.findFirst({
      where: { id: ctx.params.id, userId: auth.owner.id },
    });
    if (!member) return fail('Staff not found', 404);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);
    const { email, accessRole, customRoleId } = parsed.data;

    if (!ASSIGNABLE_ROLES.includes(accessRole as AccessRole)) {
      return fail('Invalid role', 400);
    }

    // Validate customRoleId if provided
    if (customRoleId) {
      const customRole = await prisma.customRole.findFirst({
        where: { id: customRoleId, userId: auth.owner.id },
      });
      if (!customRole) return fail('Custom role not found', 404);
    }

    // Disallow duplicate staff emails within the same tenant.
    const existing = await prisma.staffMember.findFirst({
      where: { userId: auth.owner.id, email, NOT: { id: member.id } },
    });
    if (existing) return fail('Another team member already uses this email.', 409);

    const token = crypto.randomBytes(32).toString('hex'); // raw token (shared with staff)
    const tokenHash = hashToken(token);                   // only the hash goes to the DB
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.staffMember.update({
      where: { id: member.id },
      data: {
        email,
        accessRole,
        customRoleId: customRoleId || null,
        inviteToken: tokenHash,
        inviteExpiresAt: expires,
        passwordHash: null, // force them to set a password via the invite flow
      },
    });

    securityLog({ event: 'INVITE_SENT', actorId: auth.owner.id, targetId: member.id, meta: { email, accessRole } });

    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    // Send invite email (fire-and-forget)
    emailService.raw({
      to: email,
      subject: `You're invited to join ${auth.owner.businessName || auth.owner.name} on CashTraka`,
      html: `<p>Hi,</p><p>${auth.owner.name} has invited you to join their team on CashTraka as a <strong>${accessRole}</strong>.</p><p>Click the link below to set your password and accept the invite:</p><p><a href="${baseUrl}/accept-invite/${token}">Accept Invitation</a></p><p>This link expires in 7 days.</p>`,
    }).catch(() => null);

    return ok({
      inviteUrl: `${baseUrl}/accept-invite/${token}`,
      expiresAt: expires,
    });
  });

/**
 * DELETE /api/team/[id]/invite — revoke invite and/or demote a staff member
 * back to NONE access. Does NOT delete the staff row (kept for payroll).
 */
export const DELETE = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    if (!can(auth.accessRole, 'team.invite')) {
      return forbidden('Only the account owner can revoke access.');
    }
    const member = await prisma.staffMember.findFirst({
      where: { id: ctx.params.id, userId: auth.owner.id },
    });
    if (!member) return fail('Staff not found', 404);

    await prisma.staffMember.update({
      where: { id: member.id },
      data: {
        accessRole: 'NONE',
        inviteToken: null,
        inviteExpiresAt: null,
        passwordHash: null,
      },
    });
    return ok({ revoked: true });
  });
