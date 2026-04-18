import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/Logo';
import { ReceiptActions } from '@/components/ReceiptActions';
import { formatNaira, formatDate } from '@/lib/format';
import { Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function ReceiptPage({ params }: Props) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: { businessName: true, whatsappNumber: true, receiptFooter: true },
      },
      items: true,
    },
  });
  if (!payment) notFound();

  const business = payment.user.businessName || 'Seller';
  const hasItems = payment.items.length > 0;
  const itemsTotal = payment.items.reduce(
    (s, it) => s + it.unitPrice * it.quantity,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-md px-4">
        {/* Receipt card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-border">
          {/* Header */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Receipt
                </div>
                <div className="mt-1 text-lg font-bold text-ink">{business}</div>
              </div>
              <div
                className={
                  payment.status === 'PAID'
                    ? 'flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-bold text-success-700'
                    : 'flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'
                }
              >
                {payment.status === 'PAID' && <Check size={12} />}
                {payment.status === 'PAID' ? 'Paid' : 'Pending'}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-2 border-b border-border px-6 py-5 text-sm">
            <Row label="Issued to" value={payment.customerNameSnapshot} />
            <Row label="Date" value={formatDate(payment.createdAt)} />
            <Row label="Receipt #" value={payment.id.slice(-8).toUpperCase()} mono />
          </div>

          {/* Items */}
          {hasItems ? (
            <div className="border-b border-border px-6 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payment.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 pr-2 text-ink">{it.description}</td>
                      <td className="py-2 text-center text-slate-600">{it.quantity}</td>
                      <td className="num py-2 text-right text-ink">
                        {formatNaira(it.unitPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-b border-border px-6 py-5 text-sm text-slate-600">
              Payment for services rendered.
            </div>
          )}

          {/* Total */}
          <div className="px-6 py-5">
            {hasItems && itemsTotal !== payment.amount && (
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Items subtotal</span>
                <span className="num">{formatNaira(itemsTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Total
              </span>
              <span className="num text-2xl text-ink">{formatNaira(payment.amount)}</span>
            </div>
          </div>

          {/* Footer */}
          {(payment.user.receiptFooter || payment.user.whatsappNumber) && (
            <div className="border-t border-border bg-slate-50 px-6 py-4 text-center text-xs text-slate-600">
              {payment.user.receiptFooter && (
                <div className="mb-1 font-medium text-slate-700">
                  {payment.user.receiptFooter}
                </div>
              )}
              {payment.user.whatsappNumber && (
                <div>WhatsApp: {payment.user.whatsappNumber}</div>
              )}
            </div>
          )}
        </div>

        {/* Action bar (hidden on print) */}
        <ReceiptActions
          phone={payment.phoneSnapshot}
          customerName={payment.customerNameSnapshot}
          receiptId={payment.id}
          amount={payment.amount}
          businessName={business}
        />

        {/* CashTraka attribution */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 no-print">
          <Logo size="sm" />
          <span>Receipts by CashTraka</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={mono ? 'font-mono text-ink' : 'font-medium text-ink'}>{value}</span>
    </div>
  );
}
