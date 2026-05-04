import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { vatReturnService, periodLabel, type VatPeriod } from '@/lib/services/vat-return.service';

export const runtime = 'nodejs';

/**
 * GET /api/vat-returns/[id]/csv → owner-scoped CSV dump of every
 * contributing invoice + expense line for accountant import. Always
 * regenerated from the live data.
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'vatReturns');
    if (feature) return feature;

    const result = await vatReturnService.getVatReturn(ctx.params.id, user.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const csv = vatReturnService.buildCsv({
      vatReturn: {
        period: result.vatReturn.period,
        periodStart: result.vatReturn.periodStart,
        periodEnd: result.vatReturn.periodEnd,
        outputVatKobo: result.vatReturn.outputVatKobo,
        inputVatKobo: result.vatReturn.inputVatKobo,
        netVatKobo: result.vatReturn.netVatKobo,
      },
      invoices: result.invoices.map((it) => ({
        invoiceNumber: it.invoiceNumber,
        issuedAt: it.issuedAt,
        customerName: it.customerName,
        subtotalKobo: it.subtotalKobo,
        taxKobo: it.taxKobo,
        totalKobo: it.totalKobo,
        status: it.status,
      })),
      expenses: result.expenses.map((ex) => ({
        incurredOn: ex.incurredOn,
        category: ex.category,
        vendor: ex.vendor ?? null,
        note: ex.note ?? null,
        amountKobo: ex.amountKobo,
        vatPaid: ex.vatPaid,
      })),
    });

    const fileLabel = periodLabel(
      result.vatReturn.period as VatPeriod,
      result.vatReturn.periodStart,
    )
      .replace(/\s+/g, '-')
      .toLowerCase();
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vat-return-${fileLabel}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
