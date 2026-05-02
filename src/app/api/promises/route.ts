import { ok, handled } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { createPromiseSchema } from '@/lib/validators';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

export const dynamic = 'force-dynamic';

/** GET /api/promises, list user's promises */
export async function GET(req: Request) {
  return handled(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const promises = await promiseToPayService.list(user.id, status);
    return ok(promises);
  });
}

/** POST /api/promises, create a new promise to pay */
export async function POST(req: Request) {
  return handled(async () => {
    const user = await requireUser();
    const body = await req.json();
    const data = createPromiseSchema.parse(body);
    const promise = await promiseToPayService.create({
      userId: user.id,
      ...data,
    });
    return ok(promise, 201);
  });
}
