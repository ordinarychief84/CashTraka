import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { receiptRepo } from '@/lib/repositories/receipt.repository';
import { handled, ok, validationFail } from '@/lib/api-response';

export const runtime = 'nodejs';

const querySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

/** GET /api/receipts, paginated list of receipts for the current business. */
export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      take: url.searchParams.get('take') ?? undefined,
      skip: url.searchParams.get('skip') ?? undefined,
    });
    if (!parsed.success) return validationFail(parsed.error);
    const { take, skip } = parsed.data;

    const [rows, total] = await Promise.all([
      receiptRepo.listForUser(user.id, take, skip),
      receiptRepo.countForUser(user.id),
    ]);

    return ok({ rows, total, take, skip });
  });
