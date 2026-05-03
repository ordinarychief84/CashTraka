import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getCurrentUser } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { vatReturnService, periodLabel, type VatPeriod } from '@/lib/services/vat-return.service';
import { VatReturnDoc, type VatReturnPdfData } from '@/lib/pdf-docs';
import { formatDate } from '@/lib/format';

export const runtime = 'nodejs';

/**
 * GET /api/vat-returns/[id]/pdf
 *
 * Streams the rendered VAT-return PDF inline. Owner-scoped. The PDF is
 * always re-rendered fresh from the underlying invoice/expense data so a
 * download after edits reflects the latest totals.
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

    const { vatReturn, invoices, expenses } = result;

    const data: VatReturnPdfData = {
      business: user.businessName ?? user.name,
      businessAddress: user.businessAddress,
      tin: user.tin,
      periodLabel: periodLabel(vatReturn.period as VatPeriod, vatReturn.periodStart),
      periodStartLabel: formatDate(vatReturn.periodStart),
      periodEndLabel: formatDate(vatReturn.periodEnd),
      outputVatKobo: vatReturn.outputVatKobo,
      inputVatKobo: vatReturn.inputVatKobo,
      netVatKobo: vatReturn.netVatKobo,
      invoiceCount: vatReturn.invoiceCount,
      expenseCount: vatReturn.expenseCount,
      status: vatReturn.status,
      firsReference: vatReturn.firsReference,
      generatedOnLabel: formatDate(new Date()),
      invoices: invoices.map((it) => ({
        invoiceNumber: it.invoiceNumber,
        issuedAt: it.issuedAt,
        customerName: it.customerName,
        total: it.total,
        tax: it.tax,
      })),
      expenses: expenses.map((ex) => ({
        incurredOn: ex.incurredOn,
        description:
          [ex.category, ex.vendor, ex.note].filter(Boolean).join(' · ') ||
          ex.category,
        amount: ex.amount,
        vatPaid: ex.vatPaid,
      })),
    };

    const buffer = await renderToBuffer(VatReturnDoc({ data }));
    const fileLabel = data.periodLabel.replace(/\s+/g, '-').toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vat-return-${fileLabel}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
