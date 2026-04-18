import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/Logo';
import { InvoiceActions } from '@/components/InvoiceActions';
import { formatNaira, formatDate } from '@/lib/format';
import { Check, Clock3, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = { params: { number: string } };

export default async function PublicInvoicePage({ params }: Props) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: params.number },
    include: {
      user: {
        select: {
          businessName: true,
          whatsappNumber: true,
          businessAddress: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
      items: true,
    },
  });
  if (!invoice) notFound();

  const business = invoice.user.businessName || 'Seller';
  const hasBank = invoice.user.bankName && invoice.user.bankAccountNumber;

  const StatusIcon = invoice.status === 'PAID' ? Check : invoice.status === 'CANCELLED' ? XCircle : Clock3;
  const statusLabel = invoice.status === 'PAID' ? 'Paid' : invoice.status === 'CANCELLED' ? 'Cancelled' : invoice.status === 'SENT' ? 'Awaiting payment' : 'Draft';
  const statusColor = invoice.status === 'PAID' ? 'bg-success-50 text-success-700' : invoice.status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-owed-50 text-owed-700';

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-border">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs font-bold text-brand-600">{invoice.invoiceNumber}</div>
                <div className="mt-1 text-xl font-bold text-ink">{business}</div>
                {invoice.user.businessAddress && (<div className="mt-0.5 text-xs text-slate-500">{invoice.user.businessAddress}</div>)}
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusColor}`}>
                <StatusIcon size={13} />
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="border-b border-border px-6 py-5 text-sm">
            <Row label="Invoice to" value={invoice.customerName} />
            <Row label="Phone" value={invoice.customerPhone} />
            {invoice.customerEmail && <Row label="Email" value={invoice.customerEmail} />}
            <Row label="Issued" value={formatDate(invoice.issuedAt)} />
            {invoice.dueDate && <Row label="Due" value={formatDate(invoice.dueDate)} />}
          </div>

          <div className="border-b border-border px-6 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 pr-2 text-ink">{it.description}</td>
                    <td className="py-2 text-center text-slate-600">{it.quantity}</td>
                    <td className="num py-2 text-right text-slate-600">{formatNaira(it.unitPrice)}</td>
                    <td className="num py-2 text-right text-ink">{formatNaira(it.unitPrice * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-b border-border px-6 py-5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="num">{formatNaira(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Tax / VAT</span>
                <span className="num">{formatNaira(invoice.tax)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
              <span className="text-sm uppercase tracking-wide text-slate-500">Total</span>
              <span className="num text-2xl text-ink">{formatNaira(invoice.total)}</span>
            </div>
          </div>

          {hasBank && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <div className="mx-6 my-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Pay to</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Bank</span><span className="font-semibold text-ink">{invoice.user.bankName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-mono font-semibold text-ink">{invoice.user.bankAccountNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-semibold text-ink">{invoice.user.bankAccountName}</span></div>
              </div>
            </div>
          )}

          {invoice.note && (
            <div className="border-t border-border bg-slate-50 px-6 py-4 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Note: </span>
              {invoice.note}
            </div>
          )}
        </div>

        <InvoiceActions phone={invoice.customerPhone} customerName={invoice.customerName} invoiceNumber={invoice.invoiceNumber} total={invoice.total} businessName={business} />

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 no-print">
          <Logo size="sm" />
          <span>Invoice by CashTraka</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
