import { requireUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { nrsInvoiceService } from '@/lib/services/nrs-invoice.service';

export const runtime = 'nodejs';

/** GET /api/invoices/[id]/nrs/status — check NRS submission status (stub adapter). */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const result = await nrsInvoiceService.checkInvoiceStatus(user.id, ctx.params.id);
    return ok(result);
  });
