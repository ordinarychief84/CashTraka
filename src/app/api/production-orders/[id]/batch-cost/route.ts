import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { hasFeature } from '@/lib/gate';
import {
  computeAndSaveBatchCost,
  updateLabourAndOverhead,
} from '@/lib/services/batch-cost.service';

type Ctx = { params: { id: string } };

/**
 * POST /api/production-orders/[id]/batch-cost
 *
 * Pro+ feature. Owner-scoped recompute (idempotent under unchanged
 * labour / overhead). Returns 402 with structured upgrade JSON when the
 * caller is on Free, so the client can pop the upgrade modal.
 */
export const POST = (_req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    if (!hasFeature(auth.owner, 'batchCostIntelligence')) {
      return fail('UPGRADE_REQUIRED', 402);
    }
    // Ownership guard before delegating to the service.
    const order = await prisma.productionOrder.findFirst({
      where: { id: ctx.params.id, userId: auth.owner.id, deletedAt: null },
      select: { id: true },
    });
    if (!order) return fail('Not found', 404);
    const result = await computeAndSaveBatchCost(order.id);
    if (!result.success) return fail(result.error, 400);
    return ok(result.result);
  });

const patchSchema = z.object({
  labourCostKobo: z.number().int().min(0),
  overheadCostKobo: z.number().int().min(0),
});

/**
 * PATCH /api/production-orders/[id]/batch-cost
 *
 * Inline-edit labour + overhead from the BatchCostPanel. Persists the
 * new inputs, recomputes, and returns the fresh result.
 */
export const PATCH = async (req: Request, ctx: Ctx) =>
  handled(async () => {
    const auth = await requireAuth();
    if (!hasFeature(auth.owner, 'batchCostIntelligence')) {
      return fail('UPGRADE_REQUIRED', 402);
    }
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await updateLabourAndOverhead({
      userId: auth.owner.id,
      productionOrderId: ctx.params.id,
      labourCostKobo: parsed.data.labourCostKobo,
      overheadCostKobo: parsed.data.overheadCostKobo,
    });
    if (!result.success) return fail(result.error, 400);
    return ok(result.result);
  });
