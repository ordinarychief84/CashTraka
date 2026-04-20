import { Mail, Send, CheckCircle2, AlertTriangle, Clock3, Users } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatDate, timeAgo } from '@/lib/format';
import { AdminKpi } from '@/components/admin/AdminKpi';
import { PLAN_LABELS } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

/**
 * Admin email overview — shows email flow status and trial-ending users
 * who might need attention. This page is about awareness, not sending —
 * emails are triggered automatically by the app's lifecycle events.
 */
export default async function AdminEmailsPage() {
  const admin = await requireAdminSection('emails');

  // Get users with upcoming trial endings (3 days)
  const trialEndingSoon = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'trialing',
      trialEndsAt: {
        lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        gte: new Date(),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      trialEndsAt: true,
    },
    orderBy: { trialEndsAt: 'asc' },
    take: 20,
  });

  // Get recent signups who should have received welcome emails
  const recentSignups = await prisma.user.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      name: true,
      email: true,
      businessType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Get recent billing events
  const recentBillingEvents = await prisma.paymentAttempt.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      status: true,
      targetPlan: true,
      amount: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Get lease reminders sent
  const recentReminders = await prisma.leaseReminder.findMany({
    select: {
      id: true,
      kind: true,
      sentAt: true,
      channel: true,
      user: { select: { name: true, email: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { sentAt: 'desc' },
    take: 15,
  });

  // Stats
  const totalUsersWithEmail = await prisma.user.count();
  const successfulPayments = recentBillingEvents.filter((e) => e.status === 'success').length;
  const failedPayments = recentBillingEvents.filter((e) => e.status === 'failed').length;

  return (
    <AdminShell adminName={admin.name} activePath="/admin/emails" adminRole={admin.adminRole}>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
          Email & Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Overview of all automated emails sent by CashTraka.
        </p>
      </div>

      {/* ── Email flow summary KPIs ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpi
          label="Welcome emails"
          value={String(recentSignups.length)}
          sub="Last 7 days (sent on signup)"
          tone="brand"
          icon={<Mail size={12} />}
        />
        <AdminKpi
          label="Billing emails"
          value={String(successfulPayments + failedPayments)}
          sub={`${successfulPayments} receipts · ${failedPayments} failures`}
          tone={failedPayments > 0 ? 'warning' : 'brand'}
          icon={<Send size={12} />}
        />
        <AdminKpi
          label="Trial reminders due"
          value={String(trialEndingSoon.length)}
          sub="Ending within 3 days"
          tone={trialEndingSoon.length > 0 ? 'warning' : 'neutral'}
          icon={<Clock3 size={12} />}
        />
        <AdminKpi
          label="Rent reminders"
          value={String(recentReminders.length)}
          sub="Recent lease notifications"
          tone="neutral"
          icon={<AlertTriangle size={12} />}
        />
      </div>

      {/* ── Active email flows ── */}
      <section className="card mt-6 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
          <CheckCircle2 size={16} className="text-brand-600" />
          Active email flows
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Welcome', trigger: 'On signup', status: 'active', desc: 'Personalized onboarding for sellers & landlords' },
            { name: 'Subscription Receipt', trigger: 'On payment', status: 'active', desc: 'Branded receipt with plan details & reference' },
            { name: 'Trial Started', trigger: 'On trial activation', status: 'active', desc: '14-day trial confirmation with expiry date' },
            { name: 'Trial Ending Soon', trigger: '3 days before expiry', status: 'active', desc: 'Upgrade nudge before trial expires' },
            { name: 'Trial Expired', trigger: 'On trial expiry', status: 'active', desc: 'Notification with upgrade CTA' },
            { name: 'Payment Failed', trigger: 'On charge failure', status: 'active', desc: 'Retry payment prompt' },
            { name: 'Subscription Cancelled', trigger: 'On cancellation', status: 'active', desc: 'Cancellation confirmation with access deadline' },
            { name: 'Plan Changed', trigger: 'On upgrade/downgrade', status: 'active', desc: 'New plan confirmation' },
            { name: 'Payment Receipt', trigger: 'On customer payment', status: 'active', desc: 'Branded merchant receipt' },
            { name: 'Invoice Sent', trigger: 'On invoice creation', status: 'active', desc: 'Invoice notification to customer' },
            { name: 'Password Reset', trigger: 'On forgot password', status: 'active', desc: '30-min expiry reset link' },
            { name: 'Rent Reminders', trigger: 'Daily cron (8 AM WAT)', status: 'active', desc: '4-stage lease lifecycle alerts' },
            { name: 'Weekly Summary', trigger: 'Weekly digest', status: 'planned', desc: 'Revenue & activity summary' },
          ].map((flow) => (
            <div
              key={flow.name}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{flow.name}</span>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                    (flow.status === 'active'
                      ? 'bg-success-50 text-success-700'
                      : 'bg-slate-100 text-slate-500')
                  }
                >
                  {flow.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{flow.trigger}</p>
              <p className="mt-0.5 text-xs text-slate-400">{flow.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* ── Trial ending soon ── */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Clock3 size={16} className="text-owed-600" />
            Trials ending soon
          </h2>
          {trialEndingSoon.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
              <CheckCircle2 size={14} />
              No trials ending in the next 3 days
            </div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {trialEndingSoon.map((u) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(u.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <li key={u.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-semibold text-ink">{u.name}</div>
                      <div className="text-xs text-slate-500">
                        {u.email} · {PLAN_LABELS[u.plan as keyof typeof PLAN_LABELS] ?? u.plan}
                      </div>
                    </div>
                    <span className="rounded-full bg-owed-100 px-2.5 py-0.5 text-xs font-bold text-owed-700">
                      {daysLeft}d left
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Recent rent reminders ── */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <AlertTriangle size={16} className="text-brand-600" />
            Recent rent reminders
          </h2>
          {recentReminders.length === 0 ? (
            <p className="text-xs text-slate-500">No rent reminders sent yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recentReminders.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink">{r.tenant.name}</span>
                      <span className="ml-2 text-xs text-slate-500">→ {r.user.name}</span>
                    </div>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (r.kind === 'notice_to_quit'
                          ? 'bg-red-100 text-red-700'
                          : r.kind === 'expiry_day' || r.kind === 'post_expiry'
                            ? 'bg-owed-100 text-owed-700'
                            : 'bg-slate-100 text-slate-600')
                      }
                    >
                      {r.kind.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    via {r.channel} · {timeAgo(r.sentAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Recent billing events ── */}
      <section className="card mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <Send size={16} className="text-brand-600" />
          Recent billing emails
        </h2>
        {recentBillingEvents.length === 0 ? (
          <p className="text-xs text-slate-500">No billing events yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentBillingEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{e.user.name}</span>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (e.status === 'success'
                          ? 'bg-success-50 text-success-700'
                          : e.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600')
                      }
                    >
                      {e.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {PLAN_LABELS[e.targetPlan as keyof typeof PLAN_LABELS] ?? e.targetPlan} · {e.user.email}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-sm font-bold text-ink">
                    ₦{Math.round(e.amount / 100).toLocaleString('en-NG')}
                  </div>
                  <div className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Recent welcome emails ── */}
      <section className="card mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <Users size={16} className="text-brand-600" />
          Recent signups (welcome emails sent)
        </h2>
        {recentSignups.length === 0 ? (
          <p className="text-xs text-slate-500">No signups in the last 7 days.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recentSignups.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="font-semibold text-ink">{u.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{u.email}</span>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {u.businessType === 'property_manager' ? 'landlord' : 'seller'}
                  </span>
                  <div className="text-[11px] text-slate-400">{timeAgo(u.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
