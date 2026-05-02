import { requireUser } from '@/lib/auth';
import { paymentService } from '@/lib/services/payment.service';
import { handled, ok } from '@/lib/api-response';
import { enforceQuota } from '@/lib/gate';

export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const gate = await enforceQuota(user, 'create_payment');
    if (gate) return gate;

    const body = await req.json();
    const result = await paymentService.create(user.id, body);
    return ok(result);
  });

export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'PAID' | 'PENDING' | null;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await paymentService.listForUser(user.id, {
      status: status ?? undefined,
      take,
      skip,
    });
    return ok(result);
  });
