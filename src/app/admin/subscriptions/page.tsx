import Link from 'next/link';
import {
  Search,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Clock,
  UserPlus,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { getSubscriptionStats } from '@/lib/services/subscription-metrics.service';
import { formatPriceNaira } from '@/lib/billing/pricing';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  filter?: 'all' | 'active' | 'trialing' | 'past_due' | 'cancelled' | 'override';
};

const PAGE_SIZE = 30;

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const admin = await requireAdminSection('subscriptions');
  const stats = await getSubscriptionStats();

  const where = buildWhere(searchParams);
  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      businessName: true,
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      createdAt: true,
      override: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
  });

  const filter = searchParams.filter ?? 'all';

  return (
    <AdminShell
      adminName={admin.name}
      activePath="/admin/subscriptions"
      adminRole={admin.adminRole}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Subscription control
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cross-tenant view of every paying account. Click a row to manage that
          user&apos;s plan, lifecycle and feature overrides.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={CircleDollarSign}
          label="Active subscribers"
          value={String(stats.activeSubscribers)}
          color="brand"
        />
        <Stat
          icon={Clock}
          label="Trialing"
          value={String(stats.trialing)}
        />
        <Stat
          icon={AlertTriangle}
          label="Past due"
          value={String(stats.pastDue)}
          color="danger"
        />
        <Stat
          icon={XCircle}
          label="Cancelled"
          value={String(stats.cancelled)}
        />
        <Stat
          icon={TrendingUp}
          label="Estimated MRR"
          value={formatPriceNaira(stats.mrrKobo)}
          color="brand"
        />
        <Stat
          icon={UserPlus}
          label="New this month"
          value={String(stats.newThisMonth)}
        />
        <Stat
          icon={XCircle}
          label="Churn this month"
          value={String(stats.churnThisMonth)}
          color="danger"
        />
        <Stat
          icon={ArrowUpRight}
          label="Net new MRR"
          value={
            (stats.netNewMrrKobo >= 0 ? '+' : '') +
            formatPriceNaira(Math.abs(stats.netNewMrrKobo))
          }
          color={stats.netNewMrrKobo >= 0 ? 'brand' : 'danger'}
        />
      </div>

      <form
        className="mb-4 rounded-xl border border-border bg-white p-3"
        action="/admin/subscriptions"
        method="get"
      >
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="Search by email or business name..."
              className="input !pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </div>
        <input type="hidden" name="filter" value={filter} />
      </form>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['trialing', 'Trialing'],
            ['past_due', 'Past due'],
            ['cancelled', 'Cancelled'],
            ['override', 'Has override'],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={
              '/admin/subscriptions?filter=' +
              key +
              (searchParams.q ? '&q=' + encodeURIComponent(searchParams.q) : '')
            }
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold transition',
              filter === key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trial ends</th>
                <th className="px-4 py-3">Period ends</th>
                <th className="px-4 py-3">Override</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-slate-500"
                    colSpan={9}
                  >
                    No users match the current filter.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.businessName ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold capitalize',
                          u.plan === 'free'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-brand-50 text-brand-700',
                        )}
                      >
                        {u.plan.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={u.subscriptionStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {u.trialEndsAt ? formatDate(u.trialEndsAt) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {u.currentPeriodEnd ? formatDate(u.currentPeriodEnd) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {u.override ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          <ShieldAlert size={11} /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={'/admin/users/' + u.id}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function buildWhere(sp: SP) {
  const q = sp.q?.trim();
  const filter = sp.filter ?? 'all';
  const and: any[] = [];

  if (q) {
    and.push({
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (filter === 'active') {
    and.push({ subscriptionStatus: 'active' });
  } else if (filter === 'trialing') {
    and.push({ subscriptionStatus: 'trialing' });
  } else if (filter === 'past_due') {
    and.push({ subscriptionStatus: 'past_due' });
  } else if (filter === 'cancelled') {
    and.push({ subscriptionStatus: 'cancelled' });
  } else if (filter === 'override') {
    and.push({ override: { isNot: null } });
  } else {
    // "all" - exclude pure free users with no override to keep table focused.
    and.push({
      OR: [
        { plan: { not: 'free' } },
        { subscriptionStatus: { not: 'free' } },
        { override: { isNot: null } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

function StatusPill({ status }: { status?: string | null }) {
  const s = (status ?? 'free').toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-success-50 text-success-700',
    trialing: 'bg-brand-50 text-brand-700',
    past_due: 'bg-red-50 text-red-700',
    cancelled: 'bg-amber-50 text-amber-700',
    free: 'bg-slate-100 text-slate-600',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-bold capitalize',
        map[s] ?? map.free,
      )}
    >
      {s.replace('_', ' ')}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color?: 'brand' | 'danger';
}) {
  const tint =
    color === 'brand'
      ? 'text-brand-600'
      : color === 'danger'
        ? 'text-red-500'
        : 'text-slate-500';
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={16} className={tint} />
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-lg font-black text-ink">{value}</div>
    </div>
  );
}
