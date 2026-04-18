import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { adminService } from '@/lib/services/admin.service';
import { handled, ok, validationFail } from '@/lib/api-response';

const schema = z.object({ reason: z.string().trim().max(300).optional() });

/** PATCH /api/admin/users/[id]/reactivate — lifts a suspension. */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);
    const updated = await adminService.reactivateUser(admin.id, ctx.params.id, parsed.data.reason);
    return ok({ id: updated.id, isSuspended: updated.isSuspended });
  });
