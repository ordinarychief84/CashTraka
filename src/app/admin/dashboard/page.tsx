import Link from 'next/link';
import {
  Users,
  UserCheck,
  Wallet,
  Clock3,
  TrendingUp,
  ArrowRight,
  PauseCircle,
  Activity,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { StatCard } from '@/components/StatCard';
import { analyticsService } from '@/lib/services/analytics.service';
import { formatNaira, formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const data = await analyticsService.systemMetrics();
  const { totals, recentSignups, recentPayments, recentDebts } = data;

  return (
    <AdminShell adminName={admin.name}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
          Admin overview
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Everything happening across CashTraka right now.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total users" value={String(totals.users)} tone="brand" />
        <StatCard
          label="Active (7d)"
          value={String(totals.activeUsers7d)}
          tone="brand"
          sub={`${Math.round((totals.activeUsers7d / Math.max(totals.users, 1)) * 100)}% of total`}
        />
        <StatCard label="Activated" value={String(totals.activatedUsers)} />
        <StatCard label="Zero activity" value={String(totals.zeroActivityUsers)} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Payments" value={String(totals.payments)} />
        <StatCard
          label="Revenue collected"
          value={formatNaira(totals.revenue)}
          tone="brand"
        />
        <StatCard
          label="Outstanding debt"
          value={formatNaira(totals.outstandingDebt)}
          tone="danger"
        />
        <StatCard
          label="Suspended"
          value={String(totals.suspendedUsers)}
          tone={totals.suspendedUsers > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-4 md:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <UserCheck size={16} className="text-brand-600" />
              Recent signups
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentSignups.length === 0 ? (
            <p className="text-xs text-slate-500">No signups yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentSignups.map((u) => (
                <li key={u.id} className="py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="block text-sm font-semibold text-ink hover:underline"
                  >
                    {u.name}
                  </Link>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">{u.email}</span>
                    <span className="shrink-0">{timeAgo(u.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {u.businessType === 'property_manager' ? 'Property manager' : 'Seller'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 md:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Wallet size={16} className="text-brand-600" />
            Recent payments
          </h2>
          {recentPayments.length === 0 ? (
            <p className="text-xs text-slate-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border text-xs">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">
                      {p.customerNameSnapshot}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {p.user.businessName || p.user.name} · {timeAgo(p.createdAt)}
                    </div>
                  </div>
                  <div className="num text-sm text-brand-700">{formatNaira(p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 md:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Clock3 size={16} className="text-owed-600" />
            Recent debts
          </h2>
          {recentDebts.length === 0 ? (
            <p className="text-xs text-slate-500">No debts logged yet.</p>
          ) : (
            <ul className="divide-y divide-border text-xs">
              {recentDebts.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">
                      {d.customerNameSnapshot}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {d.user.businessName || d.user.name} · {timeAgo(d.createdAt)}
                    </div>
                  </div>
                  <div className="num text-sm text-owed-600">{formatNaira(d.amountOwed)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
