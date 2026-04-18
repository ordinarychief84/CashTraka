import Link from 'next/link';
import {
  Users,
  UserPlus,
  Activity,
  Percent,
  AlertTriangle,
  Clock3,
  TrendingUp,
  Crown,
  Wallet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  Ban,
  CreditCard,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminHeroKpi } from '@/components/admin/AdminHeroKpi';
import { AdminKpi } from '@/components/admin/AdminKpi';
import { PlanDistribution } from '@/components/admin/PlanDistribution';
import {
  AdminTriage,
  AdminTriageIcons,
  type AdminTriageItem,
} from '@/components/admin/AdminTriage';
import { analyticsService } from '@/lib/services/analytics.service';
import { PLAN_LABELS } from '@/lib/plan-limits';
import { formatNaira, timeAgo, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Admin dashboard — redesigned around the questions a platform operator
 * actually asks, in the order they ask them:
 *
 *   ZONE 1 · HEROES     MRR (committed + pipeline), platform GMV this month,
 *                       total users, active-weekly — with deltas.
 *   ZONE 2 · ATTENTION  Past-due + trial-expiring-soon + suspended +
 *                       zero-activity users, ranked by urgency. One tap to
 *                       open the user record.
 *   ZONE 3 · PULSE      Plan distribution, billing-success rate, subscription
 *                       states, top tenants by GMV, conversion rate.
 *   ZONE 4 · ACTIVITY   Live feed of recent signups, payments, cancellations.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const data = await analyticsService.platformPulse();

  const { growth, plans, billing, platform, topTenants, activity } = data;

  const paidUsers =
    (plans.byStatus.active ?? 0) + (plans.byStatus.trialing ?? 0);
  const conversionPct =
    growth.totalUsers > 0
      ? Math.round((paidUsers / growth.totalUsers) * 100)
      : 0;

  // Build the triage list — rank by severity, keep it scoped.
  const triage: AdminTriageItem[] = [];
  for (const u of billing.pastDueUsers) {
    triage.push({
      id: `past-due-${u.id}`,
      severity: 'critical',
      icon: AdminTriageIcons.pastDue,
      title: `${u.name} is past due`,
      subtitle: `${PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan} · ${u.email}`,
      href: `/admin/users/${u.id}`,
    });
  }
  for (const u of billing.trialExpiringSoon) {
    const days = u.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(u.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
    triage.push({
      id: `trial-${u.id}`,
      severity: 'warning',
      icon: AdminTriageIcons.trialExpiring,
      title: `${u.name}'s trial ends in ${days}d`,
      subtitle: `${PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan} trial · ${u.email}`,
      href: `/admin/users/${u.id}`,
    });
  }
  if (growth.suspended > 0) {
    triage.push({
      id: 'suspended',
      severity: 'info',
      icon: AdminTriageIcons.suspended,
      title: `${growth.suspended} suspended ${growth.suspended === 1 ? 'account' : 'accounts'}`,
      subtitle: 'Review suspensions',
      href: '/admin/users?isSuspended=yes',
    });
  }
  if (growth.zeroActivity > 0) {
    triage.push({
      id: 'zero',
      severity: 'info',
      icon: AdminTriageIcons.zeroActivity,
      title: `${growth.zeroActivity} ${growth.zeroActivity === 1 ? 'user has' : 'users have'} zero activity`,
      subtitle: 'Onboarding drop-off risk',
      href: '/admin/users?hasActivity=no',
    });
  }

  return (
    <AdminShell adminName={admin.name} activePath="/admin/dashboard">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
            Platform overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time view of everything happening across CashTraka.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="btn-secondary">
            <Users size={16} />
            All users
          </Link>
          <Link href="/admin/analytics" className="btn-secondary">
            <TrendingUp size={16} />
            Deeper analytics
          </Link>
        </div>
      </div>

      {/* ─────────────────── ZONE 1 · HERO METRICS ─────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminHeroKpi
          label="Committed MRR"
          value={formatNaira(plans.committedMrr)}
          sub={
            plans.pipelineMrr > 0
              ? `+${formatNaira(plans.pipelineMrr)} in trial pipeline`
              : `${paidUsers} paying ${paidUsers === 1 ? 'customer' : 'customers'}`
          }
          tone="brand"
        />
        <AdminHeroKpi
          label="Platform GMV · this month"
          value={formatNaira(platform.gmvThisMonth)}
          deltaPct={platform.gmvDeltaPct}
          sub={`${platform.txnsThisMonth} ${platform.txnsThisMonth === 1 ? 'transaction' : 'transactions'}`}
          tone="violet"
        />
        <AdminHeroKpi
          label="Total users"
          value={String(growth.totalUsers)}
          deltaPct={growth.signupDeltaPct}
          sub={`+${growth.newUsers7d} this week`}
          tone="slate"
        />
        <AdminHeroKpi
          label="Active weekly"
          value={String(growth.activeLast7d)}
          sub={
            growth.totalUsers > 0
              ? `${Math.round((growth.activeLast7d / growth.totalUsers) * 100)}% of base`
              : undefined
          }
          tone="amber"
        />
      </div>

      {/* ─────────────────── ZONE 2 · NEEDS ATTENTION ─────────────────── */}
      <div className="mt-6">
        <AdminTriage items={triage} />
      </div>

      {/* ─────────────────── ZONE 3 · PULSE ─────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Supporting KPI grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
          <AdminKpi
            label="Free → paid conversion"
            value={`${conversionPct}%`}
            sub={`${paidUsers} paying of ${growth.totalUsers}`}
            tone={conversionPct >= 10 ? 'brand' : 'warning'}
            icon={<Percent size={12} />}
          />
          <AdminKpi
            label="Avg transaction"
            value={platform.avgTxn > 0 ? formatNaira(platform.avgTxn) : '—'}
            sub="Across all tenants"
            icon={<Wallet size={12} />}
          />
          <AdminKpi
            label="Outstanding debt · platform"
            value={formatNaira(platform.outstandingDebt)}
            sub="Open balances across tenants"
            tone={platform.outstandingDebt > 0 ? 'warning' : 'neutral'}
            icon={<AlertTriangle size={12} />}
          />
          <AdminKpi
            label="Billing success · 30d"
            value={
              billing.attemptsLast30d.successRatePct === null
                ? '—'
                : `${billing.attemptsLast30d.successRatePct}%`
            }
            sub={
              billing.attemptsLast30d.total > 0
                ? `${billing.attemptsLast30d.success} ok · ${billing.attemptsLast30d.failed} failed`
                : 'No charges yet'
            }
            tone={
              billing.attemptsLast30d.successRatePct === null
                ? 'neutral'
                : billing.attemptsLast30d.successRatePct >= 90
                  ? 'brand'
                  : billing.attemptsLast30d.successRatePct >= 70
                    ? 'warning'
                    : 'danger'
            }
            icon={<CreditCard size={12} />}
          />
          <AdminKpi
            label="Subscriptions · trialing"
            value={String(billing.trialingCount)}
            sub={
              billing.trialExpiringSoon.length > 0
                ? `${billing.trialExpiringSoon.length} ending in 3d`
                : 'None ending soon'
            }
            tone={billing.trialExpiringSoon.length > 0 ? 'warning' : 'neutral'}
            icon={<Clock3 size={12} />}
          />
          <AdminKpi
            label="Cancellations"
            value={String(billing.cancelledCount)}
            sub={
              billing.cancelledCount > 0 ? 'Review reasons' : 'No churn this cycle'
            }
            tone={billing.cancelledCount > 0 ? 'danger' : 'brand'}
            icon={<Ban size={12} />}
          />
        </div>

        {/* Plan distribution */}
        <div className="lg:col-span-5">
          <PlanDistribution counts={plans.byPlan} />
        </div>
      </div>

      {/* ─────────────────── ZONE 4 · ACTIVITY + TOP TENANTS ─────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Top tenants */}
        <section className="card p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Crown size={16} className="text-amber-600" />
              Top tenants · GMV this month
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              All users <ArrowRight size={12} />
            </Link>
          </div>
          {topTenants.length === 0 ? (
            <p className="text-xs text-slate-500">
              No paid transactions yet this month.
            </p>
          ) : (
            <ul className="space-y-2">
              {topTenants.map((t, i) => {
                const biggest = topTenants[0]?.gmv || 1;
                const pct = Math.round((t.gmv / biggest) * 100);
                return (
                  <li key={t.userId}>
                    <Link
                      href={`/admin/users/${t.userId}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-border hover:bg-slate-50"
                    >
                      <div
                        className={
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ' +
                          (i === 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600')
                        }
                      >
                        {i === 0 ? <Crown size={14} /> : i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {t.name}
                          </span>
                          <span className="num text-sm font-bold text-brand-700">
                            {formatNaira(t.gmv)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${Math.max(6, pct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {t.txns} tx ·{' '}
                            {PLAN_LABELS[t.plan as keyof typeof PLAN_LABELS] ?? t.plan}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent signups */}
        <section className="card p-5 lg:col-span-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <UserPlus size={16} className="text-brand-600" />
            Recent signups
          </h2>
          {activity.recentSignups.length === 0 ? (
            <p className="text-xs text-slate-500">No signups yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {activity.recentSignups.map((u) => (
                <li key={u.id} className="py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{u.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {u.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        {u.businessType.replace('_', ' ')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {timeAgo(u.createdAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent cancellations */}
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <XCircle size={16} className="text-red-600" />
            Recent cancellations
          </h2>
          {activity.recentCancellations.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
              <CheckCircle2 size={14} />
              No cancellations
            </div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {activity.recentCancellations.map((u) => (
                <li key={u.id} className="py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-ink">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan}
                        {u.currentPeriodEnd && (
                          <> · access till {formatDate(u.currentPeriodEnd)}</>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {timeAgo(u.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ─────────────────── Recent payments (wide) ─────────────────── */}
      <section className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Activity size={16} className="text-brand-600" />
            Live payment feed
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            Last 5 across all tenants
          </span>
        </div>
        {activity.recentPayments.length === 0 ? (
          <p className="text-xs text-slate-500">No payments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">
                      {p.customerNameSnapshot}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      <Building2 size={10} />
                      {p.user.businessName || p.user.name}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {timeAgo(p.createdAt)}
                  </div>
                </div>
                <div className="num text-sm font-bold text-brand-700">
                  {formatNaira(p.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
