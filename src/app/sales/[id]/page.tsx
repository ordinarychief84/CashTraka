import Link from 'next/link';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { formatNaira } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const user = await guardForBusinessType('sales');

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  if (!sale || sale.userId !== user.id) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <div className="mx-auto max-w-lg">
        <Link href="/sales" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft size={16} /> Back to Sales
        </Link>

        <div className="card p-6">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-ink">Sales Receipt</h1>
            <p className="text-sm text-slate-500">{sale.saleNumber}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(sale.soldAt).toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'medium' })}
            </p>
          </div>

          {/* Customer info */}
          {(sale.customerName || sale.customerPhone || sale.customerEmail) && (
            <div className="mb-4 rounded-lg bg-canvas p-3">
              {sale.customerName && (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <User size={14} className="text-slate-400" /> {sale.customerName}
                </div>
              )}
              {sale.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                  <Phone size={14} className="text-slate-400" /> {sale.customerPhone}
                </div>
              )}
              {sale.customerEmail && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                  <Mail size={14} className="text-slate-400" /> {sale.customerEmail}
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-500">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 text-ink">{item.description}</td>
                  <td className="py-2 text-center num">{item.quantity}</td>
                  <td className="py-2 text-right num">{formatNaira(item.unitPrice)}</td>
                  <td className="py-2 text-right num font-medium">{formatNaira(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 space-y-1">
            {sale.discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="num">{formatNaira(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-owed-600">
                  <span>Discount</span>
                  <span className="num">-{formatNaira(sale.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-ink">
              <span>Total</span>
              <span className="num">{formatNaira(sale.total)}</span>
            </div>
          </div>

          {/* Payment method & note */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{sale.paymentMethod}</span>
            {sale.note && <span>· {sale.note}</span>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
