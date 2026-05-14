import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { handled, ok, validationFail } from '@/lib/api-response';

const schema = z.object({
  materialId: z.string().min(1),
});

/**
 * POST /api/purchase-orders/from-shortage
 *   body: { materialId }
 *
 * One-click "draft me a PO for this shortage row". Server picks the
 * material's supplier, computes the exact short quantity from the
 * active shortage engine, and returns the new draft PO. The client
 * navigates the user to /purchase-orders/[id] to review + send.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const ctx = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const po = await purchaseOrdersService.createFromShortage(
      ctx.owner.id,
      parsed.data.materialId,
      ctx.principalId,
    );
    return ok({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      totalKobo: po.totalKobo,
    });
  });
