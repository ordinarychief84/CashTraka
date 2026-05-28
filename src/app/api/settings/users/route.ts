import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { workspaceUsersService } from '@/lib/services/workspace-users.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8),
  language: z.string().trim().min(1).max(8).optional(),
  userType: z.enum(['STANDARD', 'SCANNER']).optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await workspaceUsersService.listForUser(owner.id);
    return ok({ users: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await workspaceUsersService.create(owner.id, body);
    // NEVER return passwordHash — strip it.
    const { passwordHash, ...safe } = created;
    void passwordHash;
    return ok({ user: safe }, 201);
  });
}
