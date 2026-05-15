import Link from 'next/link';
import { Plus, Users2, Banknote, CalendarCheck2, ClipboardList } from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { AttendanceActions } from '@/components/AttendanceActions';
import { StaffRowActions } from '@/components/StaffRowActions';
import { TeamPageClient } from '@/components/team/TeamPageClient';
import { formatNaira } from '@/lib/format';
import { can, ROLE_LABELS, type AccessRole } from '@/lib/rbac';
import { effectivePlan, limitsFor } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

const PAY_TYPE_LABEL: Record<string, string> = {
  monthly: '/mo',
  weekly: '/wk',
  daily: '/day',
  per_task: '/task',
};

function startOfMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function startOfNextMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Team page, the day-to-day control surface for payroll. Shows stats,
 * a quick attendance toggle per staff, and a per-row "Pay" dialog.
 * Also lists this-month's recent payments so the owner can see what's
 * already been paid out.
 */
export default async function TeamPage() {
  const user = await guardWithPermission('team.read');

  const monthStart = startOfMonthUTC();
  const monthEnd = startOfNextMonthUTC();
  const today = startOfTodayUTC();

  const [staff, todayAttendance, paymentsThisMonth] = await Promise.all([
    prisma.staffMember.findMany({
      where: { userId: user.id, status: 'active' },
      include: { customRole: { select: { name: true, color: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.attendance.findMany({
      where: { userId: user.id, date: today },
    }),
    prisma.staffPayment.findMany({
      where: { userId: user.id, paidAt: { gte: monthStart, lt: monthEnd } },
      include: { staff: { select: { name: true } } },
      orderBy: { paidAt: 'desc' },
      take: 20,
    }),
  ]);

  const todayStatusMap = new Map(todayAttendance.map((a) => [a.staffId, a.status]));

  const presentToday = todayAttendance.filter(
    (a) => a.status === 'present' || a.status === 'half_day',
  ).length;

  // Expected monthly bill: monthly staff pay full amount; weekly ×4; daily
  // uses the pay rate times their days-worked so far; per-task is 0 (only
  // known when actual payments are logged).
  const expectedMonthly = staff.reduce((sum, s) => {
    if (s.payType === 'monthly') return sum + (s.payAmount || 0);
    if (s.payType === 'weekly') return sum + (s.payAmount || 0) * 4;
    // For daily/per_task we can't guess in advance; excluded from forecast.
    return sum;
  }, 0);

  const paidThisMonth = paymentsThisMonth
    .filter((p) => p.kind !== 'advance' && p.kind !== 'reimbursement')
    .reduce((s, p) => s + p.amount, 0);

  // Tax+ tier: surface an "Invite accountant" CTA that pre-selects the
  // ACCOUNTANT role on the staff form. We only render it when the seller's
  // plan includes the multi-user audit feature.
  const eff = effectivePlan(user);
  const showInviteAccountant = limitsFor(eff.plan).multiUserAudit;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}
    >
      <PageHeader
        title="Team"
        subtitle="Your staff, attendance, and payroll, all in one place."
        action={
          <Link href="/team/new" className="btn-primary">
            <Plus size={18} />
            Add member
          </Link>
        }
      />

      <TeamPageClient
        membersContent={
          <>
            {showInviteAccountant && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <ClipboardList size={18} className="mt-0.5 shrink-0 text-brand-600" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">Invite your accountant</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    Read-only access to payments, expenses, reports and tax
                    settings. Every read is logged so you can audit later.
                  </div>
                </div>
                <Link
                  href="/team/new?role=ACCOUNTANT"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600"
                >
                  <Plus size={14} />
                  Invite accountant
                </Link>
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Team size" value={String(staff.length)} />
              <StatCard
                label="Present today"
                value={`${presentToday} / ${staff.length}`}
                tone={presentToday > 0 ? 'brand' : 'neutral'}
              />
              <StatCard
                label="Monthly bill"
                value={formatNaira(expectedMonthly)}
                sub="Forecast"
              />
              <StatCard
                label="Paid this month"
                value={formatNaira(paidThisMonth)}
                tone={paidThisMonth > 0 ? 'brand' : 'neutral'}
                sub="Salary + bonus + commission"
              />
            </div>

            {staff.length === 0 ? (
              <EmptyState
                icon={Users2}
                title="No team members yet"
                description="Add the people who work for you, shop attendants, delivery, cleaners, or tailors. You'll track attendance and log every payment in one place."
                actionHref="/team/new"
                actionLabel="Add your first team member"
              />
            ) : (
              <ul className="space-y-3">
                {staff.map((s) => {
                  const todayStatus = todayStatusMap.get(s.id) as
                    | 'present'
                    | 'absent'
                    | 'half_day'
                    | 'leave'
                    | undefined;
                  const cycle = PAY_TYPE_LABEL[s.payType] || '';
                  return (
                    <li key={s.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/team/${s.id}`}
                            className="truncate text-base font-semibold text-ink hover:text-brand-700"
                          >
                            {s.name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {s.customRole ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                {s.customRole.color && (
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: s.customRole.color }}
                                  />
                                )}
                                {s.customRole.name}
                              </span>
                            ) : s.role ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                {s.role}
                              </span>
                            ) : null}
                            {s.accessRole !== 'NONE' && (
                              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">
                                {ROLE_LABELS[s.accessRole as AccessRole]}
                              </span>
                            )}
                            {s.phone && <span>{s.phone}</span>}
                            {s.payType !== 'per_task' && s.payAmount > 0 ? (
                              <span className="font-semibold text-ink">
                                {formatNaira(s.payAmount)}
                                <span className="font-normal text-slate-500">{cycle}</span>
                              </span>
                            ) : s.payType === 'per_task' ? (
                              <span className="italic text-slate-500">Per task</span>
                            ) : null}
                          </div>
                        </div>
                        <StaffRowActions
                          canInvite={can(user.accessRole, 'team.invite')}
                          staff={{
                            id: s.id,
                            name: s.name,
                            phone: s.phone,
                            email: s.email,
                            accessRole: s.accessRole as AccessRole,
                            hasLoggedIn: Boolean(s.lastLoginAt),
                            payType: s.payType,
                            payAmount: s.payAmount,
                            bankName: s.bankName,
                            bankAccountNumber: s.bankAccountNumber,
                            bankAccountName: s.bankAccountName,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Today
                        </div>
                        <AttendanceActions staffId={s.id} todayStatus={todayStatus ?? null} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {paymentsThisMonth.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Banknote size={16} className="text-brand-600" />
                  Recent payments this month
                </h2>
                <ul className="card divide-y divide-border">
                  {paymentsThisMonth.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">
                          {p.staff.name}
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            {p.kind}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(p.paidAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {p.note && <span className="ml-2">· {p.note}</span>}
                        </div>
                      </div>
                      <div
                        className={
                          'num text-sm ' +
                          (p.kind === 'advance' || p.kind === 'reimbursement'
                            ? 'text-slate-600'
                            : 'text-brand-700')
                        }
                      >
                        {formatNaira(p.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {staff.length > 0 && presentToday === 0 && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-border bg-slate-50 p-4">
                <CalendarCheck2 size={18} className="mt-0.5 text-slate-500" />
                <div className="text-xs text-slate-600">
                  <strong className="text-ink">Tip:</strong> tap the attendance chips on each
                  row as your staff arrive, at end of month it&apos;s the single source of
                  truth for how many days each one was present.
                </div>
              </div>
            )}
          </>
        }
      />
    </AppShell>
  );
}
