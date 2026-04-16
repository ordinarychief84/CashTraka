import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { can, ASSIGNABLE_ROLES, type AccessRole } from '@/lib/rbac';
import { handled, ok, fail, forbidden, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email('Enter a valid email').toLowerCase(),
  accessRole: z.enum(['MANAGER', 'CASHIER', 'VIEWER']),
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
    const { email, accessRole } = parsed.data;

    if (!ASSIGNABLE_ROLES.includes(accessRole as AccessRole)) {
      return fail('Invalid role', 400);
    }

    // Disallow duplicate staff emails within the same tenant.
    const existing = await prisma.staffMember.findFirst({
      where: { userId: auth.owner.id, email, NOT: { id: member.id } },
    });
    if (existing) return fail('Another team member already uses this email.', 409);

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.staffMember.update({
      where: { id: member.id },
      data: {
        email,
        accessRole,
        inviteToken: token,
        inviteExpiresAt: expires,
        passwordHash: null, // force them to set a password via the invite flow
      },
    });

    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
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
