import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { receiptService } from '@/lib/services/receipt.service';
import { handled, ok, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    paymentId: z.string().optional(),
    debtId: z.string().optional(),
  })
  .refine((v) => Boolean(v.paymentId) !== Boolean(v.debtId), {
    message: 'Provide exactly one of paymentId or debtId',
  });

/** POST /api/receipts/generate — force-create a Receipt for a payment or debt. */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const receipt = parsed.data.paymentId
      ? await receiptService.ensureForPayment(user.id, parsed.data.paymentId)
      : await receiptService.ensureForDebt(user.id, parsed.data.debtId!);

    return ok({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      pdfUrl: receipt.pdfUrl,
      status: receipt.status,
    });
  });
