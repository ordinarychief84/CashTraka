import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { receiptService } from '@/lib/services/receipt.service';
import { handled, ok, fail, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const bodySchema = z.object({
  to: z.string().trim().email('Enter a valid email'),
});

/** POST /api/receipts/[id]/send — email the receipt PDF to a customer. */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const result = await receiptService.sendEmail(user.id, ctx.params.id, parsed.data.to);
    if (!result.ok) {
      return fail(result.error ?? 'Could not send email', 502);
    }
    return ok({ sent: true, messageId: result.messageId, to: parsed.data.to });
  });
