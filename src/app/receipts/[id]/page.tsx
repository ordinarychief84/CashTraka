import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ReceiptActions } from '@/components/ReceiptActions';
import { FirsCompliancePanel } from '@/components/invoices/FirsCompliancePanel';
import { formatNaira, formatDateTime } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual entry',
  PAYSTACK: 'Paystack auto-confirm',
  PROMISE: 'Promise to pay',
  INSTALLMENT: 'Recurring installment',
  DEBT: 'Debt cleared',
  CATALOG: 'Catalog order',
};

export default async function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();

  const receipt = await prisma.receipt.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!receipt) notFound();

  const payment = receipt.paymentId
    ? await prisma.payment.findUnique({
        where: { id: receipt.paymentId },
        include: { items: true },
      })
    : null;
  const debt = receipt.debtId
    ? await prisma.debt.findUnique({ where: { id: receipt.debtId } })
    : null;

  // Linked tax invoice (when this receipt was issued through the manual flow
  // with VAT applied, or via "Generate invoice" on a payment).
  const taxInvoice = payment
    ? await prisma.invoice.findUnique({ where: { paymentId: payment.id } })
    : null;

  const customerName =
    payment?.customerNameSnapshot ?? debt?.customerNameSnapshot ?? 'Customer';
  const phone = payment?.phoneSnapshot ?? debt?.phoneSnapshot ?? '';
  const amount =
    payment?.amount ??
    (debt ? (debt.amountPaid > 0 ? debt.amountPaid : debt.amountOwed) : 0);
  const balance = receipt.balanceRemaining ?? 0;

  const businessName = user.businessName || user.name || 'Business';

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
          href="/receipts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} /> Back to receipts
        </Link>
      </div>

      <PageHeader
        title={receipt.receiptNumber}
        subtitle={`Issued ${formatDateTime(receipt.createdAt)} · ${SOURCE_LABEL[receipt.source] ?? receipt.source}`}
        action={
          <Link
            href={`/r/${receipt.id}`}
            target="_blank"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Public link
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Summary card */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Customer" value={customerName} />
              <Field label="Phone" value={phone ? displayPhone(phone) : '—'} />
              <Field label="Receipt #" value={receipt.receiptNumber} mono />
              <Field label="Status" value={receipt.status} />
              {payment ? (
                <Field
                  label="Linked payment"
                  value={
                    <Link
                      href={`/payments/${payment.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {payment.id.slice(-8).toUpperCase()}
                    </Link>
                  }
                />
              ) : null}
              {debt ? (
                <Field
                  label="Linked debt"
                  value={
                    <Link
                      href={`/debts/${debt.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {debt.id.slice(-8).toUpperCase()}
                    </Link>
                  }
                />
              ) : null}
            </div>

            {/* Items breakdown */}
            {payment && payment.items.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Items
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {payment.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-1.5 text-ink">{it.description}</td>
                        <td className="py-1.5 text-center text-slate-600">×{it.quantity}</td>
                        <td className="num py-1.5 text-right text-ink">
                          {formatNaira(it.unitPrice * it.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Totals */}
            <div className="mt-4 border-t border-border pt-4">
              {balance > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Amount paid</span>
                    <span className="num font-semibold">{formatNaira(amount)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                    <span className="text-sm font-semibold text-amber-700">Balance remaining</span>
                    <span className="num text-lg font-bold text-amber-700">
                      {formatNaira(balance)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </span>
                  <span className="num text-2xl font-bold text-ink">{formatNaira(amount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Share &amp; export
            </div>
            <ReceiptActions
              phone={phone}
              customerName={customerName}
              receiptId={receipt.id}
              amount={amount}
              businessName={businessName}
            />
          </div>

          {/* FIRS e-Invoice — shown only when this receipt has a linked tax
              invoice. The seller can submit it to FIRS MBS straight from
              here without navigating to /invoices. */}
          {taxInvoice ? (
            <>
              <FirsCompliancePanel
                invoiceId={taxInvoice.id}
                initial={{
                  firsStatus: taxInvoice.firsStatus,
                  firsIrn: taxInvoice.firsIrn,
                  firsLastError: taxInvoice.firsLastError,
                  firsRetryCount: taxInvoice.firsRetryCount,
                  firsSubmittedAt: taxInvoice.firsSubmittedAt
                    ? taxInvoice.firsSubmittedAt.toISOString()
                    : null,
                  firsAcceptedAt: taxInvoice.firsAcceptedAt
                    ? taxInvoice.firsAcceptedAt.toISOString()
                    : null,
                  vatApplied: taxInvoice.vatApplied,
                  vatRate: taxInvoice.vatRate,
                }}
              />
              <a
                href={`/invoices/${taxInvoice.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
              >
                <ExternalLink size={12} /> Open tax invoice {taxInvoice.invoiceNumber}
              </a>
            </>
          ) : null}
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
  value: React.ReactNode;
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
