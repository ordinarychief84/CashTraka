import { requireUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { firsInvoiceService } from '@/lib/services/firs-invoice.service';

export const runtime = 'nodejs';

/** POST /api/invoices/[id]/firs/submit, submit a tax invoice to FIRS MBS. */
export const POST = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const feature = await requireFeature(user, 'firsCompliance');
    if (feature) return feature;
    const result = await firsInvoiceService.submitInvoice(user.id, ctx.params.id);
    return ok(result);
  });
