import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { recipesService } from '@/lib/services/recipes.service';

/** GET /api/recipes — list all recipes for this user. */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get('take') ?? 100), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await recipesService.listForUser(auth.owner.id, { take, skip });
    return ok(result);
  });
