import { requireUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { firsInvoiceService } from '@/lib/services/firs-invoice.service';

export const runtime = 'nodejs';

/** GET /api/invoices/[id]/firs/status — poll FIRS for transmission status. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const result = await firsInvoiceService.checkInvoiceStatus(user.id, ctx.params.id);
    return ok(result);
  });
