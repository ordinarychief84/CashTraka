import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { shortageService } from '@/lib/services/shortage.service';

const patchSchema = z.object({
  action: z.enum(['resolve', 'ignore']),
  note: z.string().trim().max(300).optional(),
  recommendedAction: z
    .enum(['BUY_MATERIAL', 'REDUCE_PRODUCTION', 'USE_SUBSTITUTE', 'DELAY_PRODUCTION'])
    .optional(),
});

export const PATCH = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    if (parsed.data.action === 'ignore') {
      const updated = await shortageService.ignore(
        auth.owner.id,
        ctx.params.id,
        parsed.data.note ?? null,
      );
      return ok(updated);
    }
    const updated = await shortageService.resolve(auth.owner.id, ctx.params.id, {
      note: parsed.data.note ?? null,
      action: parsed.data.recommendedAction ?? null,
    });
    return ok(updated);
  });
