import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { customerOrderSchema } from '@/lib/validators';

export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam.split(',') as any) : undefined;
    const customerId = searchParams.get('customerId') ?? undefined;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await customerOrdersService.listForUser(auth.owner.id, {
      status,
      customerId,
      take,
      skip,
    });
    return ok(result);
  });

export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json();
    const input = customerOrderSchema.parse(body);
    const order = await customerOrdersService.create(
      auth.owner.id,
      input,
      auth.principalId,
    );
    return ok(order, 201);
  });
