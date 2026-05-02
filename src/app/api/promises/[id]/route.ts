import { ok, handled } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/** GET /api/promises/[id], get promise detail */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handled(async () => {
    const user = await requireUser();
    const promise = await promiseToPayService.getById(params.id, user.id);
    return ok(promise);
  });
}
