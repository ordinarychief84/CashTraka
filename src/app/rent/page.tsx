import Link from 'next/link';
import { Wallet, MessageCircle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { RentQuickActions } from '@/components/RentQuickActions';
import { formatNaira } from '@/lib/format';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type RentFilter = 'all' | 'paid' | 'pending' | 'overdue';

function parseFilter(v: string | undefined): RentFilter {
  if (v === 'paid' || v === 'pending' || v === 'overdue' || v === 'all') return v;
  return 'all';
}

type SP = { filter?: RentFilter };

export default async function RentDashboardPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
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

  type TenantRow = (typeof tenants)[number] & { currentStatus: string };
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

    rows.push({ ...t, currentStatus });
  }

  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Apply filter
  const filtered = filter === 'all'
    ? rows
    : rows.filter((r) => {
        if (filter === 'paid') return r.currentStatus === 'PAID';
        if (filter === 'pending') return r.currentStatus === 'PENDING' || r.currentStatus === 'PARTIAL';
        if (filter === 'overdue') return r.currentStatus === 'OVERDUE';
        return true;
      });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
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
          label="Collection rate"
          value={`${collectionRate}%`}
          tone={collectionRate >= 80 ? 'brand' : 'danger'}
          sub={`${filtered.length} tenants`}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterLink current={filter} value="all" label="All" />
        <FilterLink current={filter} value="paid" label="Paid" />
        <FilterLink current={filter} value="pending" label="Pending" />
        <FilterLink current={filter} value="overdue" label="Overdue" tone="owed" />
      </div>

      {/* Tenant rows */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Wallet size={28} />
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
                    <div className="mt-1 flex items-center gap-3 text-xs">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {status !== 'PAID' && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-green-600 hover:bg-green-50"
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
