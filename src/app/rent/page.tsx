import Link from 'next/link';
import { Banknote, MessageCircle, AlertTriangle, Clock } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { RentQuickActions } from '@/components/RentQuickActions';
import { RenewLeaseDialog } from '@/components/RenewLeaseDialog';
import { formatNaira } from '@/lib/format';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RentFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'expiring';

function parseFilter(v: string | undefined): RentFilter {
  if (v === 'paid' || v === 'pending' || v === 'overdue' || v === 'all' || v === 'expiring') return v;
  return 'all';
}

type SP = { filter?: RentFilter };

/** Days between two dates (positive = future, negative = past). */
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function leaseTag(leaseEnd: Date | null): { label: string; tone: 'ok' | 'warn' | 'danger' | 'none' } {
  if (!leaseEnd) return { label: '', tone: 'none' };
  const days = diffDays(leaseEnd, new Date());
  if (days < -7) return { label: 'Notice to quit', tone: 'danger' };
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: 'danger' };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: 'warn' };
  return { label: '', tone: 'ok' };
}

export default async function RentDashboardPage({ searchParams }: { searchParams: SP }) {
  const user = await guardForBusinessType('rent');
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const filter = parseFilter(searchParams.filter);

  // Get all active tenants with their current month payment
  const tenants = await prisma.tenant.findMany({
    where: { userId: user.id, status: 'active' },
    include: {
      property: { select: { id: true, name: true } },
      rentPayments: {
        where: { period: currentPeriod },
        take: 1,
      },
    },
    orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
  });

  // Compute summary
  let totalExpected = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let expiringCount = 0;

  type TenantRow = (typeof tenants)[number] & { currentStatus: string; lease: ReturnType<typeof leaseTag> };
  const rows: TenantRow[] = [];

  for (const t of tenants) {
    totalExpected += t.rentAmount;
    const payment = t.rentPayments[0];
    let currentStatus = 'PENDING';

    if (payment) {
      currentStatus = payment.status;
      if (payment.status === 'PAID') {
        totalCollected += payment.amount;
      } else if (payment.status === 'PARTIAL') {
        totalCollected += payment.amount;
        totalOutstanding += t.rentAmount - payment.amount;
      } else {
        totalOutstanding += t.rentAmount;
      }
    } else {
      totalOutstanding += t.rentAmount;
    }

    const lease = leaseTag(t.leaseEnd);
    if (lease.tone === 'warn' || lease.tone === 'danger') expiringCount++;

    rows.push({ ...t, currentStatus, lease });
  }

  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Apply filter
  const filtered = filter === 'all'
    ? rows
    : rows.filter((r) => {
        if (filter === 'paid') return r.currentStatus === 'PAID';
        if (filter === 'pending') return r.currentStatus === 'PENDING' || r.currentStatus === 'PARTIAL';
        if (filter === 'overdue') return r.currentStatus === 'OVERDUE';
        if (filter === 'expiring') return r.lease.tone === 'warn' || r.lease.tone === 'danger';
        return true;
      });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Rent"
        subtitle={`${new Date(currentPeriod + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })} overview`}
      />

      {/* Summary cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Expected this month" value={formatNaira(totalExpected)} tone="brand" />
        <StatCard label="Collected" value={formatNaira(totalCollected)} tone="brand" sub={`${collectionRate}%`} />
        <StatCard label="Outstanding" value={formatNaira(totalOutstanding)} tone={totalOutstanding > 0 ? 'danger' : 'neutral'} />
        <StatCard
          label="Leases expiring"
          value={String(expiringCount)}
          tone={expiringCount > 0 ? 'danger' : 'brand'}
          sub={expiringCount > 0 ? 'Needs attention' : 'All good'}
        />
      </div>

      {/* Lease warnings banner */}
      {expiringCount > 0 && filter !== 'expiring' && (
        <Link
          href="/rent?filter=expiring"
          className="mb-4 flex items-center gap-3 rounded-xl border border-owed-200 bg-owed-50 px-4 py-3 text-sm font-medium text-owed-800 transition hover:bg-owed-100"
        >
          <AlertTriangle size={18} className="shrink-0 text-owed-600" />
          <span>
            <strong>{expiringCount} lease{expiringCount > 1 ? 's' : ''}</strong> expiring soon or already expired, tap to view
          </span>
        </Link>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterLink current={filter} value="all" label="All" />
        <FilterLink current={filter} value="paid" label="Paid" />
        <FilterLink current={filter} value="pending" label="Pending" />
        <FilterLink current={filter} value="overdue" label="Overdue" tone="owed" />
        <FilterLink current={filter} value="expiring" label={`Expiring (${expiringCount})`} tone="owed" />
      </div>

      {/* Tenant rows */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Banknote size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {filter !== 'all' ? 'No tenants match this filter' : 'No active tenants'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {filter !== 'all' ? 'Try a different filter.' : 'Add properties and tenants first.'}
          </p>
          {filter === 'all' && (
            <Link href="/properties" className="btn-primary mt-5 inline-flex">
              Go to Properties
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const payment = t.rentPayments[0];
            const status = t.currentStatus;
            const month = new Date(currentPeriod + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
            const msg = `Hi ${t.name}, your rent of ${formatNaira(t.rentAmount)} for ${month} at ${t.property.name} is due. Kindly make payment. Thank you.`;
            const waUrl = waLink(t.phone, msg);

            return (
              <li key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="truncate font-semibold text-ink hover:text-brand-600"
                    >
                      {t.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500">
                      <Link href={`/properties/${t.property.id}`} className="hover:text-brand-600">
                        {t.property.name}
                      </Link>
                      {t.unitLabel && <> · {t.unitLabel}</>}
                      {' · '}
                      {displayPhone(t.phone)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="num font-medium text-ink">{formatNaira(t.rentAmount)}</span>
                      <span
                        className={cn(
                          status === 'PAID' && 'badge-paid',
                          status === 'PARTIAL' && 'badge-pending',
                          status === 'PENDING' && 'badge-pending',
                          status === 'OVERDUE' && 'badge-open',
                        )}
                      >
                        {status === 'PAID' && 'Paid'}
                        {status === 'PARTIAL' && `Partial (${formatNaira(payment?.amount || 0)})`}
                        {status === 'PENDING' && 'Pending'}
                        {status === 'OVERDUE' && 'Overdue'}
                      </span>
                      {t.lease.tone !== 'none' && t.lease.tone !== 'ok' && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            t.lease.tone === 'warn' && 'bg-owed-100 text-owed-800',
                            t.lease.tone === 'danger' && 'bg-red-100 text-red-800',
                          )}
                        >
                          {t.lease.tone === 'danger' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                          {t.lease.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(t.lease.tone === 'warn' || t.lease.tone === 'danger') && (
                      <RenewLeaseDialog
                        tenantId={t.id}
                        tenantName={t.name}
                        currentLeaseEnd={t.leaseEnd?.toISOString()}
                      />
                    )}
                    {status !== 'PAID' && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-success-600 hover:bg-success-50"
                        title="Send rent reminder"
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                    <RentQuickActions
                      tenantId={t.id}
                      tenantName={t.name}
                      rentAmount={t.rentAmount}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function FilterLink({
  current,
  value,
  label,
  tone,
}: {
  current: RentFilter;
  value: RentFilter;
  label: string;
  tone?: 'owed';
}) {
  const active = current === value;
  return (
    <Link
      href={`/rent?filter=${value}`}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active && tone === 'owed' && 'border-owed-500 bg-owed-500 text-white',
        active && tone !== 'owed' && 'border-brand-500 bg-brand-500 text-white',
        !active && 'border-border bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {label}
    </Link>
  );
}
