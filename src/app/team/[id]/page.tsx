import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Banknote,
  CalendarCheck2,
  CalendarX,
  Clock,
  Plane,
  Building2,
  Heart,
  Pencil,
} from 'lucide-react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StaffDetailClient } from './client';
import { formatNaira, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAY_LABEL: Record<string, string> = {
  monthly: 'Monthly salary',
  weekly: 'Weekly wage',
  daily: 'Daily wage',
  per_task: 'Per task',
};
const CYCLE_SUFFIX: Record<string, string> = {
  monthly: '/mo',
  weekly: '/wk',
  daily: '/day',
  per_task: '',
};

function startOfMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function startOfNextMonthUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/**
 * Staff detail page.
 *
 * Surfaces the two questions an owner actually asks about a single staff:
 *   1. "How much do I still owe them right this minute?"
 *   2. "How often do they turn up?"
 *
 * Balance calculation (current month):
 *   owed = expected(payType, payAmount, daysPresent) - paid(salary/bonus/commission) - advances taken
 *   A negative number means we've overpaid (or they took more advance than they've earned).
 */
export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const user = await guardWithPermission('team.read');
  const staff = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!staff) notFound();

  const monthStart = startOfMonthUTC();
  const monthEnd = startOfNextMonthUTC();

  const [attendance, payments] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: user.id, staffId: staff.id, date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: 'desc' },
    }),
    prisma.staffPayment.findMany({
      where: { userId: user.id, staffId: staff.id },
      orderBy: { paidAt: 'desc' },
      take: 50,
    }),
  ]);

  const presentDays = attendance.filter((a) => a.status === 'present').length;
  const halfDays = attendance.filter((a) => a.status === 'half_day').length;
  const absentDays = attendance.filter((a) => a.status === 'absent').length;
  const leaveDays = attendance.filter((a) => a.status === 'leave').length;

  // Effective days for payroll calculation: full + half (as 0.5).
  const effectiveDays = presentDays + halfDays * 0.5;

  // Payments this month, split
  const monthPayments = payments.filter(
    (p) => p.paidAt >= monthStart && p.paidAt < monthEnd,
  );
  const paidThisMonth = monthPayments
    .filter((p) => p.kind === 'salary' || p.kind === 'bonus' || p.kind === 'commission')
    .reduce((s, p) => s + p.amount, 0);
  const advancesThisMonth = monthPayments
    .filter((p) => p.kind === 'advance')
    .reduce((s, p) => s + p.amount, 0);

  // Expected this month
  let expected = 0;
  if (staff.payType === 'monthly') {
    expected = staff.payAmount;
  } else if (staff.payType === 'weekly') {
    // Rough: assume 4 weeks. Not perfect, but honest about "forecast".
    expected = staff.payAmount * 4;
  } else if (staff.payType === 'daily') {
    expected = Math.round(effectiveDays * staff.payAmount);
  } else {
    // per_task: expected = whatever has been paid, so balance is always 0
    expected = paidThisMonth + advancesThisMonth;
  }

  const balance = expected - paidThisMonth - advancesThisMonth;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}
    >
      <Link
        href="/team"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft size={14} />
        All team
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">{staff.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {staff.role && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {staff.role}
              </span>
            )}
            {staff.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={12} />
                {staff.phone}
              </span>
            )}
            <span className="text-slate-500">
              {PAY_LABEL[staff.payType] ?? staff.payType}
              {staff.payAmount > 0 && (
                <>
                  {' · '}
                  <strong className="text-ink">
                    {formatNaira(staff.payAmount)}
                    {CYCLE_SUFFIX[staff.payType]}
                  </strong>
                </>
              )}
            </span>
            {staff.startDate && (
              <span className="text-slate-500">Since {formatDate(staff.startDate)}</span>
            )}
          </div>
        </div>
        <Link href={`/team/${staff.id}/edit`} className="btn-secondary">
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Owed to them"
          value={formatNaira(Math.max(0, balance))}
          tone={balance > 0 ? 'danger' : 'neutral'}
          sub="This month"
        />
        <StatCard
          label="Paid this month"
          value={formatNaira(paidThisMonth)}
          tone={paidThisMonth > 0 ? 'brand' : 'neutral'}
        />
        <StatCard label="Days present" value={String(presentDays + halfDays)} sub={`${halfDays} half`} />
        <StatCard label="Days absent" value={String(absentDays)} tone={absentDays > 0 ? 'danger' : 'neutral'} />
      </div>

      <StaffDetailClient
        staff={{
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          payType: staff.payType,
          payAmount: staff.payAmount,
          bankName: staff.bankName,
          bankAccountNumber: staff.bankAccountNumber,
          bankAccountName: staff.bankAccountName,
        }}
      />

      {/* Grid: attendance + payments */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Attendance */}
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarCheck2 size={16} className="text-brand-600" />
            Attendance, {new Date().toLocaleString('en-NG', { month: 'long' })}
          </h2>
          {attendance.length === 0 ? (
            <p className="text-xs text-slate-500">
              No attendance marked yet this month. Mark today&apos;s status from the Team page.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {attendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="text-slate-700">
                    {new Date(a.date).toLocaleDateString('en-NG', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {a.note && (
                      <span className="ml-2 text-xs text-slate-500">· {a.note}</span>
                    )}
                  </div>
                  <AttendancePill status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment history */}
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Banknote size={16} className="text-brand-600" />
            Payment history
          </h2>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-500">
              No payments recorded yet. Use the Pay button above to log one.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink capitalize">{p.kind}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(p.paidAt)}
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
          )}
        </section>
      </div>

      {/* Meta cards, bank + next of kin */}
      {(staff.bankAccountNumber || staff.nextOfKinName || staff.notes) && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {staff.bankAccountNumber && (
            <MetaCard
              icon={Building2}
              title="Bank details"
              lines={[
                staff.bankName || '—',
                staff.bankAccountNumber,
                staff.bankAccountName || staff.name,
              ]}
            />
          )}
          {staff.nextOfKinName && (
            <MetaCard
              icon={Heart}
              title="Next of kin"
              lines={[
                staff.nextOfKinName,
                staff.nextOfKinPhone || '—',
              ]}
            />
          )}
          {staff.notes && (
            <MetaCard icon={Pencil} title="Notes" lines={[staff.notes]} />
          )}
        </div>
      )}
    </AppShell>
  );
}

function MetaCard({
  icon: Icon,
  title,
  lines,
}: {
  icon: typeof Phone;
  title: string;
  lines: string[];
}) {
  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Icon size={12} />
        {title}
      </div>
      <div className="text-sm text-slate-700">
        {lines.map((l, i) => (
          <div key={i} className={i === 0 ? 'font-semibold text-ink' : 'mt-0.5'}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendancePill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; Icon: typeof Phone }> = {
    present: { label: 'Present', bg: 'bg-brand-50 text-brand-700', Icon: CalendarCheck2 },
    absent: { label: 'Absent', bg: 'bg-red-50 text-red-700', Icon: CalendarX },
    half_day: { label: 'Half day', bg: 'bg-owed-50 text-owed-700', Icon: Clock },
    leave: { label: 'Leave', bg: 'bg-slate-100 text-slate-600', Icon: Plane },
  };
  const m = map[status] ?? map.present;
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' +
        m.bg
      }
    >
      <m.Icon size={10} />
      {m.label}
    </span>
  );
}
