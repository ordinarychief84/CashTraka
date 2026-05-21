import { cookies } from 'next/headers';
import {
  requireAdminOrStaff,
  setImpersonationSession,
  setOwnerSession,
  setAdminStaffSession,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { documentAudit } from '@/lib/services/document-audit.service';
import { handled, ok, fail } from '@/lib/api-response';
import { jwtVerify } from 'jose';

/**
 * POST /api/admin/users/:id/impersonate
 *
 * Starts an impersonation session. The session cookie is replaced with a
 * short-lived (1h) JWT scoped to the target user but carrying the admin's
 * id + kind so the "end" endpoint can restore them. Refuses when the
 * target is suspended, soft-deleted, or themselves an admin (we never
 * want one admin silently acting as another admin).
 */
export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdminOrStaff();
    const targetId = ctx.params.id;

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, name: true, isSuspended: true, deletedAt: true, role: true },
    });
    if (!target) return fail('User not found', 404);
    if (target.deletedAt) return fail('Cannot impersonate a deleted user', 409);
    if (target.isSuspended) return fail('Cannot impersonate a suspended user', 409);
    if (target.role === 'ADMIN' && admin.kind !== 'super_admin') {
      return fail('Only a super-admin can impersonate another admin', 403);
    }

    await setImpersonationSession(targetId, {
      id: admin.id,
      kind: admin.kind === 'super_admin' ? 'owner' : 'admin_staff',
    });

    await documentAudit.log({
      userId: targetId,
      actorId: admin.id,
      entityType: 'USER',
      entityId: targetId,
      action: 'IMPERSONATION_STARTED',
      metadata: {
        adminEmail: admin.email,
        adminKind: admin.kind,
        targetEmail: target.email,
        targetName: target.name,
        ip: null,
      },
    });

    return ok({ targetId, targetEmail: target.email });
  });

/**
 * DELETE /api/admin/users/:id/impersonate
 *
 * Ends the active impersonation by restoring the original admin's session.
 * The `:id` in the URL is informational; the source of truth is the JWT in
 * the cookie which carries the admin id + kind needed to restore.
 *
 * Deliberately does NOT call `requireAdminOrStaff()` — that gate would fail
 * because the active session is scoped to the impersonated user, not the
 * admin. Instead we open the cookie directly, verify it's an impersonation
 * token, and trust the embedded admin id.
 */
export const DELETE = () =>
  handled(async () => {
    // Next 16: cookies() is async.
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return fail('No active session', 401);

    let kind: string | undefined;
    let imp: { aid: string; akind: string; ts: number } | undefined;
    let targetSub: string | undefined;
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '');
      const { payload } = await jwtVerify(token, secret);
      kind = payload.kind as string | undefined;
      imp = payload.imp as { aid: string; akind: string; ts: number } | undefined;
      targetSub = payload.sub as string | undefined;
    } catch {
      return fail('Invalid session', 401);
    }

    if (kind !== 'owner_impersonated' || !imp) {
      return fail('Not an impersonation session', 409);
    }

    if (imp.akind === 'owner') {
      await setOwnerSession(imp.aid);
    } else {
      await setAdminStaffSession(imp.aid);
    }

    if (targetSub) {
      await documentAudit.log({
        userId: targetSub,
        actorId: imp.aid,
        entityType: 'USER',
        entityId: targetSub,
        action: 'IMPERSONATION_ENDED',
        metadata: {
          durationMs: Date.now() - imp.ts,
          adminKind: imp.akind,
        },
      });
    }

    return ok({ restoredAdminId: imp.aid });
  });
