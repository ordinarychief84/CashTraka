import { requireUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { nrsInvoiceService } from '@/lib/services/nrs-invoice.service';

export const runtime = 'nodejs';

/** POST /api/invoices/[id]/nrs/retry — retry a failed NRS submission. */
export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const result = await nrsInvoiceService.retrySubmission(user.id, ctx.params.id);
    return ok(result);
  });
