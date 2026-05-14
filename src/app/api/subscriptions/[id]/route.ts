import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { subscriptionsService } from '@/lib/services/subscriptions.service';

export const runtime = 'nodejs';

const patchSchema = z.object({
  status: z.enum(['active', 'paused', 'cancelled']),
});

/**
 * PATCH /api/subscriptions/[id]  { status: 'active'|'paused'|'cancelled' }
 *
 * Pause stops the cron from materialising new orders without losing the
 * snapshot — Resume by PATCHing back to 'active'. Cancel is terminal.
 */
export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);
    const updated = await subscriptionsService.setStatus(
      user.id,
      ctx.params.id,
      parsed.data.status,
    );
    return ok(updated);
  });
