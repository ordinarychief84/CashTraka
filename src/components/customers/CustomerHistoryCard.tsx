import Link from 'next/link';
import {
  Banknote,
  Clock,
  FileText,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Inline customer history — drops onto any detail page that names a
 * customer (order, invoice, production order). Surfaces the
 * accumulating institutional memory that becomes the user's switching
 * cost: total paid, total owed, transaction count, last payment, last
 * order, behaviour tag, and a credit-limit warning chip when relevant.
 *
 * Renders nothing when `customerId` is null or the customer can't be
 * resolved — keeps callers from having to null-check.
 */
export async function CustomerHistoryCard({
  userId,
  customerId,
  className,
}: {
  userId: string;
  customerId: string | null | undefined;
  className?: string;
}) {
  if (!customerId) return null;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    select: {
      id: true,
      name: true,
      phone: true,
      totalPaidKobo: true,
      totalOwedKobo: true,
      transactionCount: true,
      lastActivityAt: true,
      avgPayDays: true,
      behaviorTag: true,
      creditLimitKobo: true,
      createdAt: true,
    },
  });
  if (!customer) return null;

  const [lastPayment, recentInvoices, recentOrders] = await Promise.all([
    prisma.payment.findFirst({
      where: { userId, customerId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amountKobo: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { userId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalKobo: true,
        amountPaidKobo: true,
        createdAt: true,
      },
    }),
    prisma.customerOrder.findMany({
      where: { userId, customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalKobo: true,
        createdAt: true,
      },
    }),
  ]);

  const creditLimitKobo = customer.creditLimitKobo;
  const owedPct =
    creditLimitKobo && creditLimitKobo > 0
      ? Math.round((customer.totalOwedKobo / creditLimitKobo) * 100)
      : null;
  const overLimit = creditLimitKobo != null && customer.totalOwedKobo > creditLimitKobo;
  const nearLimit = !overLimit && owedPct !== null && owedPct >= 75;

  return (
    <section
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-white p-5 shadow-xs',
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">Customer history</h2>
        <Link
          href={`/customers/${customer.id}`}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          View profile
        </Link>
      </header>

      {(overLimit || nearLimit) && (
        <div
          className={cn(
            'mb-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs',
            overLimit
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-owed-200 bg-owed-50 text-owed-800',
          )}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {overLimit
              ? `Over credit limit · ${formatKobo(customer.totalOwedKobo)} owed of ${formatKobo(creditLimitKobo!)} allowed`
              : `Near credit limit · ${owedPct}% of ${formatKobo(creditLimitKobo!)} used`}
          </span>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Stat
          Icon={Banknote}
          label="Total paid"
          value={formatKobo(customer.totalPaidKobo)}
          tone="success"
        />
        <Stat
          Icon={Wallet}
          label="Currently owed"
          value={formatKobo(customer.totalOwedKobo)}
          tone={customer.totalOwedKobo > 0 ? 'rose' : 'slate'}
        />
        <Stat
          Icon={TrendingUp}
          label="Transactions"
          value={String(customer.transactionCount)}
          tone="brand"
        />
        <Stat
          Icon={Clock}
          label="Avg pay days"
          value={customer.avgPayDays != null ? `${customer.avgPayDays.toFixed(1)}d` : '—'}
          tone="slate"
        />
      </dl>

      {lastPayment && (
        <p className="mt-3 text-[11px] text-slate-500">
          Last payment {timeAgo(lastPayment.createdAt)} · {formatKobo(lastPayment.amountKobo)}
        </p>
      )}

      {(recentInvoices.length > 0 || recentOrders.length > 0) && (
        <>
          <hr className="my-4 border-border" />
          {recentOrders.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Recent orders
              </div>
              <ul className="space-y-1.5">
                {recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-2 text-xs hover:opacity-90"
                    >
                      <span className="truncate">
                        <span className="font-mono font-bold text-ink">{o.orderNumber}</span>
                        <span className="ml-1.5 text-slate-500">
                          {o.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </span>
                      <span className="num shrink-0 font-semibold text-ink">
                        {formatKobo(o.totalKobo)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recentInvoices.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Recent invoices
              </div>
              <ul className="space-y-1.5">
                {recentInvoices.map((i) => {
                  const outstanding = Math.max(0, i.totalKobo - i.amountPaidKobo);
                  return (
                    <li key={i.id}>
                      <Link
                        href={`/invoices/${i.id}`}
                        className="flex items-center justify-between gap-2 text-xs hover:opacity-90"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <FileText size={11} className="shrink-0 text-slate-400" />
                          <span className="font-mono font-bold text-ink">{i.invoiceNumber}</span>
                          <span className="text-slate-500">{i.status.toLowerCase()}</span>
                        </span>
                        <span
                          className={cn(
                            'num shrink-0 font-semibold',
                            outstanding > 0 ? 'text-rose-700' : 'text-success-700',
                          )}
                        >
                          {outstanding > 0
                            ? formatKobo(outstanding) + ' owed'
                            : formatKobo(i.totalKobo)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Banknote;
  label: string;
  value: string;
  tone: 'success' | 'rose' | 'brand' | 'slate';
}) {
  const TONE_TEXT: Record<string, string> = {
    success: 'text-success-700',
    rose: 'text-rose-700',
    brand: 'text-brand-700',
    slate: 'text-slate-700',
  };
  const TONE_BG: Record<string, string> = {
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand-50 text-brand-700',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="flex items-start gap-2">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONE_BG[tone])}>
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className={cn('num truncate text-sm font-bold', TONE_TEXT[tone])}>{value}</dd>
      </div>
    </div>
  );
}
