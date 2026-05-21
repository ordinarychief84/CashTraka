import { ok, handled } from '@/lib/api-response';
import { initPromisePaymentSchema } from '@/lib/validators';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/**
 * POST /api/promises/[id]/pay
 * Initialize a payment for a promise. Public-facing (no auth required).
 * The promise ID comes from the public token lookup.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return handled(async () => {
    const body = await req.json();
    const data = initPromisePaymentSchema.parse(body);
    const result = await promiseToPayService.initPayment({
      promiseId: params.id,
      amount: data.amount,
      email: data.email,
      provider: data.provider,
    });
    return ok(result);
  });
}
