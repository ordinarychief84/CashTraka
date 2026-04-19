import Link from 'next/link';
import { Bell, MessageCircle, CheckCheck, Clock3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ReminderActions } from '@/components/ReminderActions';
import { formatNaira, formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RemindersPage() {
  const user = await guard();
  const now = new Date();

  const schedules = await prisma.reminderSchedule.findMany({
    where: { userId: user.id, enabled: true },
    include: {
      debt: true,
    },
    orderBy: { nextDueAt: 'asc' },
  });

  const dueNow = schedules.filter((s) => s.nextDueAt <= now && s.debt.status === 'OPEN');
  const upcoming = schedules.filter((s) => s.nextDueAt > now && s.debt.status === 'OPEN');
  const completed = schedules.filter((s) => s.debt.status === 'PAID');

  const FREQ_LABEL: Record<string, string> = {
    daily: 'Every day',
    every_3_days: 'Every 3 days',
    weekly: 'Every week',
    custom: 'Custom interval',
  };

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Reminders"
        subtitle="Automatic follow-up schedules for your debts. Send them one tap at a time."
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders set up"
          description="Go to any open debt and tap the menu → Set reminder. Reminders surface here when they're due."
          actionHref="/debts"
          actionLabel="View debts"
        />
      ) : (
        <div className="space-y-6">
          {/* Due now */}
          {dueNow.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-owed-700">
                <Bell size={16} />
                Due now — send these today ({dueNow.length})
              </h2>
              <ul className="space-y-2">
                {dueNow.map((s) => {
                  const remaining = Math.max(s.debt.amountOwed - s.debt.amountPaid, 0);
                  return (
                    <li key={s.id} className="card border-owed-500/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">{s.debt.customerNameSnapshot}</div>
                          <div className="mt-0.5 text-xs text-slate-600">
                            Owes <span className="num text-owed-600">{formatNaira(remaining)}</span>
                            {s.debt.dueDate ? ` · Due ${formatDate(s.debt.dueDate)}` : ''}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {FREQ_LABEL[s.frequency] || s.frequency}
                            {s.lastSentAt ? ` · Last sent ${timeAgo(s.lastSentAt)}` : ' · Never sent'}
                          </div>
                        </div>
                        <ReminderActions
                          scheduleId={s.id}
                          name={s.debt.customerNameSnapshot}
                          phone={s.debt.phoneSnapshot}
                          amount={remaining}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock3 size={16} />
                Upcoming ({upcoming.length})
              </h2>
              <ul className="card divide-y divide-border">
                {upcoming.map((s) => {
                  const remaining = Math.max(s.debt.amountOwed - s.debt.amountPaid, 0);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{s.debt.customerNameSnapshot}</div>
                        <div className="text-xs text-slate-500">
                          {formatNaira(remaining)} · next {formatDate(s.nextDueAt)}
                        </div>
                      </div>
                      <span className="badge bg-brand-50 text-brand-700">{FREQ_LABEL[s.frequency]}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Cleared debts */}
          {completed.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <CheckCheck size={16} />
                Cleared — no longer sending ({completed.length})
              </h2>
              <ul className="card divide-y divide-border">
                {completed.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{s.debt.customerNameSnapshot}</div>
                      <div className="text-xs text-slate-500">
                        Debt paid · Last sent {s.lastSentAt ? timeAgo(s.lastSentAt) : 'never'}
                      </div>
                    </div>
                    <span className="badge-paid">Cleared</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
