/**
 * GET    /api/installments/[id], Get installment plan detail with charge history.
 * POST   /api/installments/[id], Cancel an installment plan.
 */

import { requireAuth } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { installmentService } from '@/lib/services/installment.service';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handled(async () => {
    const auth = await requireAuth();
    const { id } = await ctx.params;

    const plan = await installmentService.getById(id, auth.owner.id);
    if (!plan) {
      return fail('Installment plan not found', 404);
    }

    return ok(plan);
  });
}

/**
 * POST /api/installments/[id] with body { action: "cancel" }
 * Cancels the installment plan, stopping all future charges.
 */
export async function POST(req: Request, ctx: Ctx) {
  return handled(async () => {
    const auth = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();

    if (body.action !== 'cancel') {
      return fail('Unknown action. Supported: "cancel"', 400);
    }

    await installmentService.cancel(id, auth.owner.id);

    return ok({
      message: 'Installment plan cancelled. No further charges will be made.',
    });
  });
}
