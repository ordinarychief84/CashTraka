import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, setStaffSession } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const schema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

/**
 * POST /api/team/accept-invite
 *
 * Staff clicks their invite link, lands on /accept-invite/[token], and
 * submits a new password. This endpoint:
 *   - validates the token is still live (not expired, not already accepted)
 *   - hashes the password
 *   - signs them in as staff (sets a staff session cookie)
 *   - clears the invite token (single-use)
 */
export const POST = (req: Request) =>
  handled(async () => {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const { token, password } = parsed.data;

    const staff = await prisma.staffMember.findUnique({
      where: { inviteToken: token },
    });
    if (!staff) return fail('This invite link is no longer valid.', 404);
    if (!staff.inviteExpiresAt || staff.inviteExpiresAt.getTime() < Date.now()) {
      return fail('This invite link has expired. Ask the owner to send a new one.', 410);
    }
    if (staff.accessRole === 'NONE') {
      return fail('This staff has not been granted app access.', 403);
    }

    const passwordHash = await hashPassword(password);
    const updated = await prisma.staffMember.update({
      where: { id: staff.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiresAt: null,
        lastLoginAt: new Date(),
      },
    });

    await setStaffSession(updated.id);

    return ok({
      id: updated.id,
      name: updated.name,
      accessRole: updated.accessRole,
    });
  });
