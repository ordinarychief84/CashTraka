import Link from 'next/link';
import { FileMinus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CreditNotesPage() {
  const user = await guard();
  const rows = await prisma.creditNote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true, customerName: true, total: true },
      },
    },
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Credit notes"
        subtitle="Reverse part or all of an invoice. Issued from the invoice detail page."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileMinus}
          title="No credit notes yet"
          description="Open an invoice and use 'Issue credit note' to reverse part or all of its value."
          actionHref="/invoices"
          actionLabel="Go to invoices"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-brand-600">
                    {cn.creditNoteNumber}
                  </td>
                  <td className="px-3 py-2">
                    {cn.invoice ? (
                      <Link
                        href={`/invoices/${cn.invoice.id}`}
                        className="font-mono text-xs text-slate-700 hover:text-brand-600"
                      >
                        {cn.invoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {cn.invoice?.customerName ?? '-'}
                  </td>
                  <td className="num px-3 py-2 text-right font-semibold text-ink">
                    {formatNaira(cn.total)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {cn.reason || '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {formatDate(cn.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
