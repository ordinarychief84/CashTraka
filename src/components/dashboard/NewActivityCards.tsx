import Link from 'next/link';
import {
  Banknote,
  Clock3,
  FileText,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { formatNaira, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

type Item = {
  icon: LucideIcon;
  label: string;
  primary: string;
  sub?: string;
  meta1?: { label: string; value: string };
  meta2?: { label: string; value: string; highlight?: 'success' | 'owed' };
  href: string;
  iconTone: 'brand' | 'owed' | 'slate';
};

type Payment = {
  id: string;
  customerNameSnapshot: string;
  amount: number;
  status: string;
  createdAt: Date;
};
type Debt = {
  id: string;
  customerNameSnapshot: string;
  amountOwed: number;
  amountPaid: number;
  dueDate: Date | null;
  createdAt: Date;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: Date;
};

type Props = {
  latestPayment: Payment | null;
  latestDebt: Debt | null;
  latestInvoice: Invoice | null;
  businessType: string;
};

const TONE: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-600',
  owed: 'bg-owed-50 text-owed-600',
  slate: 'bg-slate-100 text-slate-600',
};

/**
 * The "New Courses" equivalent — three at-a-glance cards showing the latest
 * payment, latest money-owed entry and latest invoice with deep links.
 */
export function NewActivityCards({
  latestPayment,
  latestDebt,
  latestInvoice,
  businessType,
}: Props) {
  const isPm = businessType === 'property_manager';

  const items: Item[] = [];

  if (latestPayment) {
    items.push({
      icon: Banknote,
      label: isPm ? 'Latest rent payment' : 'Latest payment',
      primary: latestPayment.customerNameSnapshot,
      meta1: { label: 'Amount', value: formatNaira(latestPayment.amount) },
      meta2: {
        label: 'Status',
        value: latestPayment.status === 'PAID' ? 'Paid' : 'Pending',
        highlight: latestPayment.status === 'PAID' ? 'success' : undefined,
      },
      sub: timeAgo(latestPayment.createdAt),
      href: `/payments?q=${encodeURIComponent(latestPayment.customerNameSnapshot)}`,
      iconTone: 'brand',
    });
  }

  if (latestDebt) {
    const remaining = Math.max(latestDebt.amountOwed - latestDebt.amountPaid, 0);
    items.push({
      icon: Clock3,
      label: isPm ? 'Latest unpaid rent' : 'Latest debt',
      primary: latestDebt.customerNameSnapshot,
      meta1: { label: 'Remaining', value: formatNaira(remaining) },
      meta2: {
        label: 'Due',
        value: latestDebt.dueDate
          ? new Date(latestDebt.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
          : 'No date',
        highlight: 'owed',
      },
      sub: timeAgo(latestDebt.createdAt),
      href: `/debts?q=${encodeURIComponent(latestDebt.customerNameSnapshot)}`,
      iconTone: 'owed',
    });
  }

  if (latestInvoice) {
    items.push({
      icon: FileText,
      label: 'Latest invoice',
      primary: latestInvoice.invoiceNumber,
      meta1: { label: 'Total', value: formatNaira(latestInvoice.total) },
      meta2: {
        label: 'Status',
        value:
          latestInvoice.status === 'PAID' ? 'Paid'
          : latestInvoice.status === 'SENT' ? 'Awaiting'
          : latestInvoice.status === 'CANCELLED' ? 'Cancelled'
          : 'Draft',
        highlight: latestInvoice.status === 'PAID' ? 'success' : undefined,
      },
      sub: latestInvoice.customerName,
      href: `/invoice/${latestInvoice.invoiceNumber}`,
      iconTone: 'slate',
    });
  }

  // Pad with empty-state cards if we have fewer than 3 real items
  while (items.length < 3) items.push(emptyItem(items.length, isPm));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">New activity</h2>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((it, i) => (
          <Link
            key={i}
            href={it.href}
            className="card flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE[it.iconTone])}>
                <it.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {it.label}
                </div>
                <div className="mt-0.5 truncate text-sm font-bold text-ink">{it.primary}</div>
                {it.sub && <div className="truncate text-[11px] text-slate-500">{it.sub}</div>}
              </div>
            </div>
            {(it.meta1 || it.meta2) && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-[11px]">
                {it.meta1 && (
                  <div>
                    <div className="text-slate-500">{it.meta1.label}</div>
                    <div className="num mt-0.5 text-sm font-bold text-ink">{it.meta1.value}</div>
                  </div>
                )}
                {it.meta2 && (
                  <div>
                    <div className="text-slate-500">{it.meta2.label}</div>
                    <div
                      className={cn(
                        'mt-0.5 text-sm font-bold',
                        it.meta2.highlight === 'success' && 'text-success-700',
                        it.meta2.highlight === 'owed' && 'text-owed-600',
                        !it.meta2.highlight && 'text-ink',
                      )}
                    >
                      {it.meta2.value}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function emptyItem(idx: number, isPm: boolean): Item {
  const templates: Item[] = [
    {
      icon: Banknote,
      label: isPm ? 'Latest rent payment' : 'Latest payment',
      primary: 'No payments yet',
      sub: 'Tap to add your first',
      href: '/payments/new',
      iconTone: 'brand',
    },
    {
      icon: Clock3,
      label: isPm ? 'Latest unpaid rent' : 'Latest debt',
      primary: 'No debts yet',
      sub: 'Everyone is caught up',
      href: '/debts/new',
      iconTone: 'owed',
    },
    {
      icon: FileText,
      label: 'Latest invoice',
      primary: 'No invoices yet',
      sub: 'Tap to create one',
      href: '/invoices/new',
      iconTone: 'slate',
    },
  ];
  return templates[idx] ?? templates[0];
}
