import Link from 'next/link';
import { Plus, Banknote } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PaymentRowActions } from '@/components/PaymentRowActions';

import { TimeRange } from '@/components/TimeRange';
import { VerificationBadge } from '@/components/VerificationBadge';
import { formatNaira, formatDateTime } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';
import { parseRange, rangeStart } from '@/lib/range';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type VerificationFilter = 'all' | 'verified' | 'unverified';

type SP = {
  q?: string;
  status?: 'PAID' | 'PENDING' | 'ALL';
  range?: string;
  verification?: VerificationFilter;
  openReceipt?: string;
};

function parseVerification(v: string | undefined): VerificationFilter {
  if (v === 'verified' || v === 'unverified') return v;
  return 'all';
}

export default async function PaymentsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const status = (searchParams.status as SP['status']) || 'ALL';
  const range = parseRange(searchParams.range);
  const start = rangeStart(range);
  const verification = parseVerification(searchParams.verification);

  const payments = await prisma.payment.findMany({
    where: {
      userId: user.id,
      ...(status !== 'ALL' ? { status } : {}),
      ...(start ? { createdAt: { gte: start } } : {}),
      ...(verification === 'verified' ? { verified: true } : {}),
      ...(verification === 'unverified' ? { verified: false } : {}),
      ...(q ? { OR: [ { customerNameSnapshot: { contains: q } }, { phoneSnapshot: { contains: q.replace(/\D/g, '') } } ] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const total = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Payments"
        subtitle="Cash and transfers you've received or are expecting."
        action={
          <Link href="/payments/new" className="btn-primary">
            <Plus size={18} />
            Add payment
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TimeRange value={range} basePath="/payments" />
        <div className="text-sm text-slate-600">
          Paid in view: <span className="num text-success-700">{formatNaira(total)}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusLink current={status} value="ALL" label="All" range={range} verification={verification} />
        <StatusLink current={status} value="PAID" label="Paid" range={range} verification={verification} />
        <StatusLink current={status} value="PENDING" label="Pending" range={range} verification={verification} />
        {(status !== 'ALL' || verification !== 'all') && (
          <Link href={`/payments?range=${range}`} className="ml-auto text-sm text-slate-500 underline">
            Reset
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <VerificationLink current={verification} value="all" label="All verification" q={q} range={range} status={status} />
        <VerificationLink current={verification} value="verified" label="Verified" q={q} range={range} status={status} />
        <VerificationLink current={verification} value="unverified" label="Unverified" q={q} range={range} status={status} tone="owed" />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={q || status !== 'ALL' || verification !== 'all' ? 'No payments match your filters' : 'No payments yet'}
          description={
            q || status !== 'ALL' || verification !== 'all'
              ? 'Try a different filter or reset.'
              : 'Add your first payment to start tracking.'
          }
          actionHref="/payments/new"
          actionLabel="Add Payment"
        />
      ) : (
        <ul className="card divide-y divide-border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">
                  {p.customerNameSnapshot}
                </div>
                <div className="text-xs text-slate-500">
                  {displayPhone(p.phoneSnapshot)} · {formatDateTime(p.createdAt)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <VerificationBadge
                    verified={p.verified}
                    claimed={Boolean(p.claimedAt)}
                    method={p.verificationMethod}
                  />
                  {p.referenceCode && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      {p.referenceCode}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={
                    p.status === 'PAID' ? 'num text-success-700' : 'num text-ink'
                  }
                >
                  {formatNaira(p.amount)}
                </div>
                <span className={p.status === 'PAID' ? 'badge-paid' : 'badge-pending'}>
                  {p.status === 'PAID' ? 'Paid' : 'Pending'}
                </span>
              </div>
              <PaymentRowActions
                id={p.id}
                status={p.status as 'PAID' | 'PENDING'}
                verified={p.verified}
                amount={p.amount}
                referenceCode={p.referenceCode}
                customerName={p.customerNameSnapshot}
                phone={p.phoneSnapshot}
                createdAt={p.createdAt.toISOString()}
                businessName={user.businessName ?? 'Business'}
                autoOpenReceipt={searchParams.openReceipt === p.id}
              />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function StatusLink({
  current,
  value,
  label,
  range,
  verification,
}: {
  current: string;
  value: string;
  label: string;
  range: string;
  verification: string;
}) {
  const active = current === value;
  const qs = new URLSearchParams();
  qs.set('range', range);
  if (value !== 'ALL') qs.set('status', value);
  if (verification && verification !== 'all') qs.set('verification', verification);
  return (
    <Link
      href={`/payments?${qs.toString()}`}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-border bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {label}
    </Link>
  );
}

function VerificationLink({
  current,
  value,
  label,
  q,
  range,
  status,
  tone,
}: {
  current: VerificationFilter;
  value: VerificationFilter;
  label: string;
  q: string;
  range: string;
  status: string;
  tone?: 'owed';
}) {
  const active = current === value;
  const qs = new URLSearchParams();
  qs.set('verification', value);
  qs.set('range', range);
  if (status && status !== 'ALL') qs.set('status', status);
  if (q) qs.set('q', q);
  return (
    <Link
      href={`/payments?${qs.toString()}`}
      className={cn(
        'rounded-full border px-3 py-1.5 font-semibold transition',
        active && tone === 'owed' && 'border-owed-500 bg-owed-500 text-white',
        active && !tone && 'border-brand-500 bg-brand-500 text-white',
        !active && 'border-border bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {label}
    </Link>
  );
}
