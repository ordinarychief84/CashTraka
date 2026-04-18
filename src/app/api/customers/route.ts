import { requireUser } from '@/lib/auth';
import { customerService } from '@/lib/services/customer.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/customers — paginated list / search. */
export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await customerService.forUser(user.id, { q, take, skip });
    return ok(result);
  });
