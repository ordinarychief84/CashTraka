import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { adminService } from '@/lib/services/admin.service';
import { handled, ok, validationFail } from '@/lib/api-response';

const schema = z.object({ note: z.string().trim().min(2).max(1000) });

/** POST /api/admin/users/[id]/notes — append an AdminNote to a user. */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);
    const note = await adminService.addNote(admin.id, ctx.params.id, parsed.data.note);
    return ok(note);
  });
