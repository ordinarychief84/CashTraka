import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { purchaseOrderSchema } from '@/lib/validators';

export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as any) : undefined;
    const supplierId = searchParams.get('supplierId') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await purchaseOrdersService.listForUser(auth.owner.id, {
      status,
      supplierId,
      take,
      skip,
    });
    return ok(result);
  });

export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = purchaseOrderSchema.parse(body);
    const po = await purchaseOrdersService.create(
      auth.owner.id,
      input,
      auth.principalId,
    );
    return ok(po, 201);
  });
