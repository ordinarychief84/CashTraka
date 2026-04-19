import Link from 'next/link';
import { Plus, FileText, Send, MessageCircle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { InvoiceRowActions } from '@/components/InvoiceRowActions';
import { formatNaira, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', SENT: 'Sent', PAID: 'Paid', CANCELLED: 'Cancelled' };
const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'badge bg-slate-100 text-slate-600',
  SENT: 'badge bg-brand-50 text-brand-700',
  PAID: 'badge-paid',
  CANCELLED: 'badge bg-red-50 text-red-700',
};

export default async function InvoicesPage() {
  const user = await guard();
  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Invoices"
        subtitle="Generate, send and track invoices for your sales."
        action={
          <Link href="/invoices/new" className="btn-primary">
            <Plus size={18} />
            New invoice
          </Link>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create a professional invoice, share it on WhatsApp, and get paid."
          actionHref="/invoices/new"
          actionLabel="Create your first invoice"
        />
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600">
                      {inv.invoiceNumber}
                    </span>
                    <span className={STATUS_CLASS[inv.status] || 'badge'}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-semibold text-ink">{inv.customerName}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Created {formatDate(inv.createdAt)}
                    {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-lg text-ink">{formatNaira(inv.total)}</div>
                </div>
                <InvoiceRowActions
                  id={inv.id}
                  invoiceNumber={inv.invoiceNumber}
                  status={inv.status}
                  customerName={inv.customerName}
                  phone={inv.customerPhone}
                  total={inv.total}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
