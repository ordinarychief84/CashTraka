import { requireUser } from '@/lib/auth';
import { customerService } from '@/lib/services/customer.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/customers/[id] — customer profile + recent payments + debts. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const detail = await customerService.detailForUser(user.id, ctx.params.id);
    return ok(detail);
  });
