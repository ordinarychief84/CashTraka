import { requireAdmin } from '@/lib/auth';
import { adminService } from '@/lib/services/admin.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/admin/users/[id] — full detail + aggregates + admin notes. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    await requireAdmin();
    const data = await adminService.userDetail(ctx.params.id);
    return ok(data);
  });
