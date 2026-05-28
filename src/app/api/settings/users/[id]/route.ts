import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { workspaceUsersService } from '@/lib/services/workspace-users.service';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
  language: z.string().trim().min(1).max(8).optional(),
  userType: z.enum(['STANDARD', 'SCANNER']).optional(),
  autoBookAdjustments: z.boolean().optional(),
  autoBookMovements: z.boolean().optional(),
  associatedEmployee: z.string().trim().max(100).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = UpdateSchema.parse(await req.json());
    const updated = await workspaceUsersService.update(owner.id, params.id, body);
    const { passwordHash, ...safe } = updated;
    void passwordHash;
    return ok({ user: safe });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    await workspaceUsersService.softDelete(owner.id, params.id);
    return ok({ deleted: true });
  });
}
