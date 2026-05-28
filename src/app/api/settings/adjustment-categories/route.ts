import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { adjustmentCategoriesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().max(60).nullable().optional(),
});

export async function GET() {
  return handled(async () => {
    const { owner } = await requireAuth();
    const rows = await adjustmentCategoriesService.listForUser(owner.id);
    return ok({ adjustmentCategories: rows });
  });
}

export async function POST(req: Request) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const body = CreateSchema.parse(await req.json());
    const created = await adjustmentCategoriesService.create(owner.id, body);
    return ok({ adjustmentCategory: created }, 201);
  });
}
