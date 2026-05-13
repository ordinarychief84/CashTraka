import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { productionOrderSchema } from '@/lib/validators';

/** GET /api/production-orders?status=&take=&skip= */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as any) : undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await productionOrdersService.listForUser(auth.owner.id, {
      status,
      take,
      skip,
    });
    return ok(result);
  });

/** POST /api/production-orders */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = productionOrderSchema.parse(body);
    const result = await productionOrdersService.create(
      auth.owner.id,
      input,
      auth.principalId,
    );
    return ok(result, 201);
  });
