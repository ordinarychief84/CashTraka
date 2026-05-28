import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { languagesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(8),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await languagesService.listForUser(owner.id);
    return ok({ languages: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await languagesService.create(owner.id, body);
    return ok({ language: created }, 201);
  });
}
