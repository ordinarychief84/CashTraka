import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { workspaceUsersService } from '@/lib/services/workspace-users.service';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = Schema.parse(await req.json());
    await workspaceUsersService.changePassword(
      owner.id,
      params.id,
      body.currentPassword ?? '',
      body.newPassword,
    );
    return ok({ updated: true });
  });
}
