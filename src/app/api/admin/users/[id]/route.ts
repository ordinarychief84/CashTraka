import { requireAdmin } from '@/lib/auth';
import { adminService } from '@/lib/services/admin.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/admin/users/[id], full detail + aggregates + admin notes. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    await requireAdmin();
    const data = await adminService.userDetail(ctx.params.id);
    return ok(data);
  });

/** DELETE /api/admin/users/[id], permanently delete a user and all their data. */
export const DELETE = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const result = await adminService.deleteUser(admin.id, ctx.params.id, body.reason);
    return ok(result);
  });
