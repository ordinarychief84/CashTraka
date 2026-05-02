import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, ClipboardList, Play, Check } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StartChecklistButton } from '@/components/StartChecklistButton';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CAT_BADGE: Record<string, string> = {
  daily_opening: 'bg-brand-50 text-brand-700',
  delivery: 'bg-success-50 text-success-700',
  inspection: 'bg-owed-50 text-owed-700',
  custom: 'bg-slate-100 text-slate-600',
};
const CAT_LABEL: Record<string, string> = {
  daily_opening: 'Daily opening',
  delivery: 'Delivery',
  inspection: 'Inspection',
  custom: 'Custom',
};

export default async function ChecklistsPage() {
  const user = await guard();
  // Checklists are for sellers only — property managers use inspection
  // workflows inside property detail instead.
  if (user.businessType === 'property_manager') redirect('/dashboard');

  const [checklists, recentRuns] = await Promise.all([
    prisma.checklist.findMany({
      where: { userId: user.id },
      include: { items: { select: { id: true } }, _count: { select: { runs: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.checklistRun.findMany({
      where: { userId: user.id },
      include: {
        checklist: { select: { name: true } },
        results: { select: { checked: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Checklists"
        subtitle="Reusable step-by-step lists for daily operations."
        action={
          <Link href="/checklists/new" className="btn-primary">
            <Plus size={18} />
            Create
          </Link>
        }
      />

      {checklists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No checklists yet"
          description="Create your first, e.g. Daily opening, Order packing, Property inspection."
          actionHref="/checklists/new"
          actionLabel="Create checklist"
        />
      ) : (
        <ul className="space-y-2">
          {checklists.map((cl) => (
            <li key={cl.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{cl.name}</span>
                    <span className={cn('badge text-[10px]', CAT_BADGE[cl.category] || CAT_BADGE.custom)}>
                      {CAT_LABEL[cl.category] || cl.category}
                    </span>
                  </div>
                  {cl.description && (
                    <div className="mt-0.5 truncate text-xs text-slate-500">{cl.description}</div>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    {cl.items.length} {cl.items.length === 1 ? 'item' : 'items'} · {cl._count.runs} {cl._count.runs === 1 ? 'run' : 'runs'}
                  </div>
                </div>
                <StartChecklistButton checklistId={cl.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {recentRuns.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Recent runs</h2>
          <ul className="card divide-y divide-border">
            {recentRuns.map((run) => {
              const total = run.results.length;
              const done = run.results.filter((r) => r.checked).length;
              const isComplete = done === total && total > 0;
              return (
                <li key={run.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{run.checklist.name}</div>
                    <div className="text-xs text-slate-500">
                      Started {timeAgo(run.startedAt)}
                      {run.completedAt && ` · Completed ${timeAgo(run.completedAt)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'num text-xs',
                        isComplete ? 'text-success-700' : 'text-slate-600',
                      )}
                    >
                      {done}/{total}
                    </span>
                    {isComplete ? (
                      <span className="badge-paid"><Check size={10} /> Done</span>
                    ) : (
                      <Link
                        href={`/checklists/${run.checklistId}/run?runId=${run.id}`}
                        className="rounded-md border border-brand-500 bg-white px-2 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50"
                      >
                        Continue
                      </Link>
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
