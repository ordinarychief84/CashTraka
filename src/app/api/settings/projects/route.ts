import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { projectsService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  number: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await projectsService.listForUser(owner.id);
    return ok({ projects: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await projectsService.create(owner.id, body);
    return ok({ project: created }, 201);
  });
}
