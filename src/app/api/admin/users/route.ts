import { requireAdmin } from '@/lib/auth';
import { adminService } from '@/lib/services/admin.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/admin/users — paginated, filterable list of all users. */
export const GET = (req: Request) =>
  handled(async () => {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const raw = Object.fromEntries(searchParams.entries());
    const result = await adminService.listUsers(raw);
    return ok(result);
  });
