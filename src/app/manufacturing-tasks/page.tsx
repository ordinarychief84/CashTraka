import Link from 'next/link';
import {
  Plus,
  ClipboardCheck,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/services/manufacturingTask.service';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = { status?: string; productionOrderId?: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-brand-100 text-brand-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const PRIORITY_DOTS: Record<string, string> = {
  LOW: 'bg-slate-300',
  NORMAL: 'bg-brand-400',
  HIGH: 'bg-amber-500',
  URGENT: 'bg-rose-500',
};

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'neutral' | 'brand' | 'amber' | 'rose' | 'emerald';
}) {
  const toneClasses = {
    neutral: 'bg-slate-50 text-slate-600',
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xl font-black text-ink">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default async function ManufacturingTasksPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const kpis = await manufacturingTaskService.getDashboardKpis(user.id);

  const statusParam = searchParams.status;
  const statuses = statusParam ? (statusParam.split(',') as any) : undefined;

  const { rows: tasks, total } = await manufacturingTaskService.listForUser(user.id, {
    status: statuses,
    take: 100,
  });

  const statusTabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'On Hold', value: 'ON_HOLD' },
    { label: 'Done', value: 'DONE' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const currentTab = statusParam ?? '';

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Manufacturing Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Discrete production steps assigned to your team — mixing, cutting, assembly, QC, packaging and more.
          </p>
        </div>
        <Link href="/manufacturing-tasks/new" className="btn-pill-primary">
          <Plus size={14} />
          New Task
        </Link>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Pending" value={kpis.pending} icon={Clock} tone="neutral" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon={PlayCircle} tone="brand" />
        <KpiCard label="On Hold" value={kpis.onHold} icon={PauseCircle} tone="amber" />
        <KpiCard label="Done Today" value={kpis.doneToday} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Overdue" value={kpis.overdue} icon={AlertTriangle} tone="rose" />
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/manufacturing-tasks?status=${tab.value}` : '/manufacturing-tasks'}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              currentTab === tab.value
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-border bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No tasks yet"
          description="Manufacturing tasks are the individual steps your team works through — mixing a batch, cutting fabric, packaging finished goods. Create your first task to get started."
          actionHref="/manufacturing-tasks/new"
          actionLabel="Create a task"
        />
      ) : (
        <div className="card divide-y divide-border">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/manufacturing-tasks/${task.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors"
            >
              {/* Priority dot */}
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  PRIORITY_DOTS[task.priority] ?? 'bg-slate-300',
                )}
                title={task.priority}
              />

              {/* Main content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {task.taskNumber}
                  </span>
                  <span className="font-semibold text-ink truncate">{task.title}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      STATUS_COLORS[task.status] ?? 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {TASK_TYPE_LABELS[task.taskType as keyof typeof TASK_TYPE_LABELS] ?? task.taskType}
                  </span>
                  {task.productionOrder && (
                    <span>
                      {task.productionOrder.productionNumber}
                      {task.productionOrder.title ? ` · ${task.productionOrder.title}` : ''}
                    </span>
                  )}
                  {task.plannedEndAt && (
                    <span>Due {formatDate(task.plannedEndAt)}</span>
                  )}
                  {task.workers.length > 0 && (
                    <span>
                      {task.workers.map((w) => w.staffMember.name).join(', ')}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {task.status === 'IN_PROGRESS' && task.progress > 0 && (
                  <div className="mt-1.5 h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right text-xs text-slate-400">
                {timeAgo(task.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > tasks.length && (
        <p className="mt-3 text-center text-xs text-slate-500">
          Showing {tasks.length} of {total} tasks
        </p>
      )}
    </AppShell>
  );
}
