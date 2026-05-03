import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { FirsCompliancePanel } from '@/components/invoices/FirsCompliancePanel';
import { InvoiceDetailActions } from '@/components/invoices/InvoiceDetailActions';
import { SendServiceCheckButton } from '@/components/feedback/SendServiceCheckButton';
import { formatNaira, formatDate } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  CREDITED: 'Credited',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await guard();

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true },
  });
  if (!invoice) notFound();

  // Sum of credit notes against this invoice — surfaced alongside Paid /
  // Outstanding so the seller sees the full ledger.
  const creditAgg = await prisma.creditNote.aggregate({
    where: { invoiceId: invoice.id, userId: user.id },
    _sum: { total: true },
  });
  const creditedTotal = creditAgg._sum.total ?? 0;
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid - creditedTotal);

  const existingFeedback = await prisma.feedback.findFirst({
    where: { userId: user.id, invoiceId: invoice.id, source: 'INVOICE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, publicToken: true },
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-3">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} /> Back to invoices
        </Link>
      </div>

      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${STATUS_LABEL[invoice.status] ?? invoice.status} · Issued ${formatDate(invoice.issuedAt)}`}
        action={
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Download size={16} /> Download PDF
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {/* Bill-to + lines + totals */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Customer" value={invoice.customerName} />
              <Field label="Phone" value={displayPhone(invoice.customerPhone)} />
              {invoice.customerEmail ? (
                <Field label="Email" value={invoice.customerEmail} />
              ) : null}
              {invoice.buyerTin ? (
                <Field label="Buyer TIN" value={invoice.buyerTin} mono />
              ) : null}
              {invoice.buyerAddress ? (
                <Field label="Buyer address" value={invoice.buyerAddress} />
              ) : null}
              {invoice.dueDate ? (
                <Field label="Due" value={formatDate(invoice.dueDate)} />
              ) : null}
              <Field label="Currency" value={invoice.currency || 'NGN'} />
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Items
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-1.5">Description</th>
                    <th className="pb-1.5">Type / HS</th>
                    <th className="pb-1.5 text-center">Qty</th>
                    <th className="pb-1.5 text-right">Price</th>
                    <th className="pb-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 text-ink">
                        {it.description}
                        {it.vatExempt ? (
                          <span className="ml-1.5 inline-flex rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            VAT-exempt
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 text-xs text-slate-500">
                        {it.itemType === 'SERVICE' ? 'Service' : it.hsCode || 'Goods'}
                      </td>
                      <td className="py-1.5 text-center text-slate-600">{it.quantity}</td>
                      <td className="num py-1.5 text-right text-slate-600">
                        {formatNaira(it.unitPrice)}
                      </td>
                      <td className="num py-1.5 text-right font-semibold text-ink">
                        {formatNaira(it.unitPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="num">{formatNaira(invoice.subtotal)}</span>
              </div>
              {invoice.vatApplied || invoice.tax > 0 ? (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    VAT{invoice.vatRate ? ` (${invoice.vatRate}%)` : ''}
                  </span>
                  <span className="num">{formatNaira(invoice.tax)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </span>
                <span className="num text-2xl font-bold text-ink">
                  {formatNaira(invoice.total)}
                </span>
              </div>
              {invoice.amountPaid > 0 ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Paid</span>
                  <span className="num">{formatNaira(invoice.amountPaid)}</span>
                </div>
              ) : null}
              {creditedTotal > 0 ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Credited</span>
                  <span className="num">{formatNaira(creditedTotal)}</span>
                </div>
              ) : null}
              {outstanding > 0 ? (
                <div className="flex justify-between text-xs font-semibold text-red-700">
                  <span>Outstanding</span>
                  <span className="num">{formatNaira(outstanding)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <InvoiceDetailActions
            id={invoice.id}
            status={invoice.status}
            publicToken={invoice.publicToken ?? null}
            hasCustomerEmail={!!invoice.customerEmail}
            hasCustomerPhone={!!invoice.customerPhone}
          />

          <FirsCompliancePanel
            invoiceId={invoice.id}
            initial={{
              firsStatus: invoice.firsStatus,
              firsIrn: invoice.firsIrn,
              firsLastError: invoice.firsLastError,
              firsRetryCount: invoice.firsRetryCount,
              firsSubmittedAt: invoice.firsSubmittedAt
                ? invoice.firsSubmittedAt.toISOString()
                : null,
              firsAcceptedAt: invoice.firsAcceptedAt
                ? invoice.firsAcceptedAt.toISOString()
                : null,
              vatApplied: invoice.vatApplied,
              vatRate: invoice.vatRate,
            }}
          />

          <div className="rounded-xl border border-border bg-white p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service Check
            </div>
            <p className="mb-3 text-xs text-slate-600">
              Ask the customer how they felt about this order.
            </p>
            <SendServiceCheckButton
              source="INVOICE"
              invoiceId={invoice.id}
              customerId={invoice.customerId ?? undefined}
              customerName={invoice.customerName}
              phone={invoice.customerPhone || undefined}
              feedbackId={existingFeedback?.id}
              publicToken={existingFeedback?.publicToken}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={mono ? 'mt-0.5 font-mono text-sm text-ink' : 'mt-0.5 text-sm text-ink'}>
        {value}
      </div>
    </div>
  );
}
