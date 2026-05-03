import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageCircle, Banknote, Clock3, Heart, AlertTriangle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { FraudWarning } from '@/components/FraudWarning';
import { SendServiceCheckButton } from '@/components/feedback/SendServiceCheckButton';
import { formatNaira, formatDateTime, timeAgo } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

type Item =
  | { kind: 'payment'; id: string; amount: number; status: 'PAID' | 'PENDING'; at: Date }
  | { kind: 'debt'; id: string; amount: number; status: 'OPEN' | 'PAID'; at: Date };

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  if (user.businessType === 'property_manager') redirect('/tenants');
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!customer) notFound();

  const [payments, debts, feedbackRows, unresolvedNegativeCount] = await Promise.all([
    prisma.payment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.debt.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.feedback.findMany({
      where: { userId: user.id, customerId: customer.id, submittedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.feedback.count({
      where: {
        userId: user.id,
        customerId: customer.id,
        isNegative: true,
        isResolved: false,
        submittedAt: { not: null },
      },
    }),
  ]);

  const RATING_LABEL: Record<string, { label: string; cls: string }> = {
    VERY_HAPPY: { label: 'Very happy', cls: 'bg-success-100 text-success-800' },
    HAPPY: { label: 'Happy', cls: 'bg-brand-50 text-brand-700' },
    UNHAPPY: { label: 'Unhappy', cls: 'bg-amber-50 text-amber-700' },
    VERY_UNHAPPY: { label: 'Very unhappy', cls: 'bg-red-50 text-red-700' },
  };

  const items: Item[] = [
    ...payments.map(
      (p): Item => ({
        kind: 'payment',
        id: p.id,
        amount: p.amount,
        status: p.status as 'PAID' | 'PENDING',
        at: p.createdAt,
      }),
    ),
    ...debts.map(
      (d): Item => ({
        kind: 'debt',
        id: d.id,
        amount: d.amountOwed,
        status: d.status as 'OPEN' | 'PAID',
        at: d.createdAt,
      }),
    ),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title={customer.name}
        subtitle={displayPhone(customer.phone)}
        backHref="/customers"
        action={
          <Link
            href={`/follow-up?customerId=${customer.id}`}
            className="btn-wa text-sm"
          >
            <MessageCircle size={16} />
            Follow up
          </Link>
        }
      />

      <div className="mb-4">
        <FraudWarning phone={customer.phone} customerName={customer.name} />
      </div>

      {unresolvedNegativeCount > 0 ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <div className="font-semibold">Customer may need attention</div>
            <div className="mt-0.5 text-xs">
              {unresolvedNegativeCount} unresolved negative {unresolvedNegativeCount === 1 ? 'rating' : 'ratings'}.
              Reach out and follow up to keep this relationship.
            </div>
          </div>
        </div>
      ) : null}

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Heart size={14} className="text-brand-600" />
            Feedback history
          </h2>
          <SendServiceCheckButton
            source="MANUAL"
            customerId={customer.id}
            customerName={customer.name}
            phone={customer.phone}
            size="sm"
          />
        </div>
        {feedbackRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-4 text-xs text-slate-600">
            No feedback collected yet for this customer.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {feedbackRows.map((f) => {
              const pill =
                RATING_LABEL[f.rating] ?? {
                  label: f.rating,
                  cls: 'bg-slate-100 text-slate-700',
                };
              return (
                <li key={f.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + pill.cls
                      }
                    >
                      {pill.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {f.submittedAt ? formatDateTime(f.submittedAt) : ''}
                    </span>
                  </div>
                  {f.comment ? (
                    <div className="mt-1 text-xs text-slate-600">&ldquo;{f.comment}&rdquo;</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Total paid" value={formatNaira(customer.totalPaid)} tone="brand" />
        <StatCard
          label="Outstanding"
          value={formatNaira(customer.totalOwed)}
          tone={customer.totalOwed > 0 ? 'danger' : 'neutral'}
        />
        <StatCard label="Transactions" value={String(customer.transactionCount)} />
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Last activity: {timeAgo(customer.lastActivityAt)}
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Activity history</h2>
      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-600">
          No activity yet.
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`} className="flex items-center gap-3 px-4 py-3">
              <div
                className={
                  it.kind === 'payment'
                    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600'
                    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-owed-50 text-owed-600'
                }
              >
                {it.kind === 'payment' ? <Banknote size={18} /> : <Clock3 size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">
                  {it.kind === 'payment' ? 'Payment' : 'Debt'}
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(it.at)}</div>
              </div>
              <div className="text-right">
                <div
                  className={
                    it.kind === 'payment' && it.status === 'PAID'
                      ? 'num text-success-700'
                      : it.kind === 'debt' && it.status === 'OPEN'
                      ? 'num text-owed-600'
                      : 'num text-ink'
                  }
                >
                  {formatNaira(it.amount)}
                </div>
                <div className="text-xs text-slate-500">
                  {it.kind === 'payment'
                    ? it.status === 'PAID'
                      ? 'Paid'
                      : 'Pending'
                    : it.status === 'OPEN'
                    ? 'Open'
                    : 'Cleared'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
