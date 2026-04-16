import Link from 'next/link';
import { Plus, Users2, Clock, Timer } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { ClockActions } from '@/components/ClockActions';
import { formatNaira, formatDateTime, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await guard();

  const staff = await prisma.staffMember.findMany({
    where: { userId: user.id, status: 'active' },
    orderBy: { name: 'asc' },
  });

  // For each staff member, find their open clock entry (if any).
  const openEntries = await prisma.clockEntry.findMany({
    where: { userId: user.id, clockOut: null },
  });
  const openMap = new Map(openEntries.map((e) => [e.staffId, e]));

  // Today's completed entries for the summary.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEntries = await prisma.clockEntry.findMany({
    where: {
      userId: user.id,
      clockIn: { gte: todayStart },
      clockOut: { not: null },
    },
    include: { staff: { select: { name: true, hourlyRate: true, dailyRate: true } } },
    orderBy: { clockIn: 'desc' },
  });

  const totalHoursToday = todayEntries.reduce((s, e) => s + (e.hoursWorked ?? 0), 0);
  const totalWagesToday = todayEntries.reduce((s, e) => {
    const hr = e.hoursWorked ?? 0;
    if (e.staff.hourlyRate) return s + Math.round(hr * e.staff.hourlyRate);
    if (e.staff.dailyRate && hr >= 1) return s + e.staff.dailyRate;
    return s;
  }, 0);

  const clockedInCount = openEntries.length;

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader
        title="Team"
        subtitle="Manage your staff, track their hours, and calculate wages."
        action={
          <Link href="/team/new" className="btn-primary">
            <Plus size={18} />
            Add member
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Team size" value={String(staff.length)} />
        <StatCard
          label="Clocked in now"
          value={String(clockedInCount)}
          tone={clockedInCount > 0 ? 'brand' : 'neutral'}
        />
        <StatCard label="Hours today" value={`${totalHoursToday.toFixed(1)}h`} />
        <StatCard
          label="Wages today"
          value={formatNaira(totalWagesToday)}
          tone={totalWagesToday > 0 ? 'danger' : 'neutral'}
          sub="Based on rates"
        />
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No team members yet"
          description="Add your helpers, delivery staff, or cleaners. Track their hours and auto-calculate wages."
          actionHref="/team/new"
          actionLabel="Add your first team member"
        />
      ) : (
        <ul className="space-y-2">
          {staff.map((s) => {
            const openEntry = openMap.get(s.id);
            const isClockedIn = Boolean(openEntry);
            return (
              <li key={s.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-semibold text-ink">{s.name}</div>
                      {isClockedIn && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                          <Timer size={10} className="animate-pulse" />
                          Working
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {s.role && <span className="badge bg-slate-100 text-slate-600">{s.role}</span>}
                      {s.phone && <span>{s.phone}</span>}
                      {s.hourlyRate && <span>₦{s.hourlyRate}/hr</span>}
                      {s.dailyRate && <span>₦{s.dailyRate}/day</span>}
                    </div>
                    {isClockedIn && openEntry && (
                      <div className="mt-1 text-xs text-brand-600">
                        Clocked in {timeAgo(openEntry.clockIn)}
                      </div>
                    )}
                  </div>
                  <ClockActions
                    staffId={s.id}
                    staffName={s.name}
                    openEntryId={openEntry?.id ?? null}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Today's completed clock entries */}
      {todayEntries.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock size={16} className="text-brand-600" />
            Today's time log
          </h2>
          <ul className="card divide-y divide-border">
            {todayEntries.map((e) => {
              const wage = e.staff.hourlyRate
                ? Math.round((e.hoursWorked ?? 0) * e.staff.hourlyRate)
                : e.staff.dailyRate ?? 0;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{e.staff.name}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(e.clockIn)} → {e.clockOut ? formatDateTime(e.clockOut) : '...'}
                      {e.note && <span className="ml-2">· {e.note}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-sm text-ink">{(e.hoursWorked ?? 0).toFixed(1)}h</div>
                    {wage > 0 && (
                      <div className="num text-xs text-owed-600">{formatNaira(wage)}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
