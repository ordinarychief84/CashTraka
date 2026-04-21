import { ok, handled } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';

/** POST /api/promises/[id]/cancel — cancel a promise */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handled(async () => {
    const user = await requireUser();
    const result = await promiseToPayService.cancel(params.id, user.id);
    return ok(result);
  });
}
