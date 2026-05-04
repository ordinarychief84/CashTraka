import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { InvoiceRowActions } from '@/components/InvoiceRowActions';
import { formatKobo, formatDate } from '@/lib/format';

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

// Mirrors the public-page STATUS_TONE so the seller-facing colors match
// what the customer sees.
const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'badge bg-slate-100 text-slate-700',
  SENT: 'badge bg-brand-50 text-brand-700',
  VIEWED: 'badge bg-brand-50 text-brand-700',
  PARTIALLY_PAID: 'badge bg-amber-50 text-amber-700',
  PAID: 'badge-paid',
  OVERDUE: 'badge bg-red-50 text-red-700',
  CANCELLED: 'badge bg-slate-100 text-slate-500',
  CREDITED: 'badge bg-slate-100 text-slate-500',
};

export default async function InvoicesPage() {
  const user = await guard();

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      invoiceNumber: true,
      publicToken: true,
      status: true,
      customerName: true,
      customerPhone: true,
      totalKobo: true,
      amountPaidKobo: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
    },
  });

  // Inline summary rollup. Mirrors /api/invoices/summary so we don't
  // round-trip just to render the cards.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let outstanding = 0;
  let paidThisMonth = 0;
  let overdueCount = 0;
  let draftCount = 0;
  for (const inv of invoices) {
    if (inv.status === 'DRAFT') draftCount++;
    if (inv.status === 'CANCELLED' || inv.status === 'CREDITED') continue;
    const remaining = Math.max(0, inv.totalKobo - inv.amountPaidKobo);
    outstanding += remaining;
    if (inv.paidAt && inv.paidAt >= startOfMonth) paidThisMonth += inv.amountPaidKobo;
    if (remaining > 0 && inv.dueDate && inv.dueDate.getTime() < now.getTime()) {
      overdueCount++;
    }
  }

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
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

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Outstanding" value={formatKobo(outstanding)} accent="brand" />
        <SummaryCard label="Paid this month" value={formatKobo(paidThisMonth)} accent="success" />
        <SummaryCard label="Overdue" value={String(overdueCount)} accent="red" />
        <SummaryCard label="Drafts" value={String(draftCount)} accent="slate" />
      </div>

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
                <Link href={`/invoices/${inv.id}`} className="min-w-0 flex-1">
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
                </Link>
                <div className="text-right">
                  <div className="num text-lg text-ink">{formatKobo(inv.totalKobo)}</div>
                </div>
                <InvoiceRowActions
                  id={inv.id}
                  invoiceNumber={inv.invoiceNumber}
                  publicToken={inv.publicToken ?? null}
                  status={inv.status}
                  customerName={inv.customerName}
                  phone={inv.customerPhone}
                  total={inv.totalKobo}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'brand' | 'success' | 'red' | 'slate';
}) {
  const tone =
    accent === 'brand'
      ? 'text-brand-700'
      : accent === 'success'
        ? 'text-success-700'
        : accent === 'red'
          ? 'text-red-700'
          : 'text-slate-700';
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`num mt-1 text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}
