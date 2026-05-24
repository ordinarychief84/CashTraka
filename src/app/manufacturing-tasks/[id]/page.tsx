import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardCheck,
  User,
  Calendar,
  Factory,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { manufacturingTaskService } from '@/lib/services/manufacturingTask.service';
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '@/lib/services/manufacturingTask.service';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ManufacturingTaskActions } from '@/components/ops/ManufacturingTaskActions';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-brand-100 text-brand-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  NORMAL: 'bg-brand-50 text-brand-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-rose-100 text-rose-700',
};

const ACTIVITY_ICONS: Record<string, string> = {
  STATUS_CHANGE: '🔄',
  PROGRESS_UPDATE: '📊',
  NOTE: '📝',
  WORKER_ADDED: '👤',
  WORKER_REMOVED: '🚫',
};

export default async function ManufacturingTaskDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await guard();

  let task: Awaited<ReturnType<typeof manufacturingTaskService.getForUser>> | null = null;
  try {
    task = await manufacturingTaskService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  if (!task) notFound();

  const staffMembers = await prisma.staffMember.findMany({
    where: { userId: user.id, status: 'active' },
    orderBy: { name: 'asc' },
    take: 100,
    select: { id: true, name: true, role: true },
  });

  const assignedIds = task.workers.map((w) => w.staffMember.id);
  const availableStaff = staffMembers.filter((s) => !assignedIds.includes(s.id));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/manufacturing-tasks"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink"
        >
          <ArrowLeft size={14} />
          Manufacturing Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-500">{task.taskNumber}</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
                STATUS_COLORS[task.status] ?? 'bg-slate-100 text-slate-700',
              )}
            >
              {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                PRIORITY_COLORS[task.priority] ?? 'bg-slate-100 text-slate-600',
              )}
            >
              {PRIORITY_LABELS[task.priority] ?? task.priority} priority
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">{task.title}</h1>
          {task.description && (
            <p className="mt-1 text-sm text-slate-600">{task.description}</p>
          )}
        </div>
        <Link
          href={`/manufacturing-tasks/${task.id}/edit`}
          className="btn-pill-ghost"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Status actions */}
          <ManufacturingTaskActions
            taskId={task.id}
            currentStatus={task.status as any}
            currentProgress={task.progress}
            availableStaff={availableStaff}
            assignedWorkers={task.workers.map((w) => ({
              id: w.id,
              staffMemberId: w.staffMember.id,
              name: w.staffMember.name,
              role: w.role,
            }))}
          />

          {/* Progress bar */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Progress</span>
              <span className="num text-sm font-bold text-brand-700">{task.progress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  task.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500',
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            {task.targetQty != null && (
              <p className="mt-2 text-xs text-slate-500">
                Target: {task.targetQty} units
                {task.completedQty != null ? ` · Completed: ${task.completedQty}` : ''}
              </p>
            )}
          </div>

          {/* Activity log */}
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-bold text-ink">Activity</h2>
            {task.activities.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {task.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-base leading-none">
                      {ACTIVITY_ICONS[a.type] ?? '•'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        {a.type === 'STATUS_CHANGE' && (
                          <>
                            Status changed
                            {a.fromStatus && ` from ${TASK_STATUS_LABELS[a.fromStatus as keyof typeof TASK_STATUS_LABELS] ?? a.fromStatus}`}
                            {a.toStatus && ` to ${TASK_STATUS_LABELS[a.toStatus as keyof typeof TASK_STATUS_LABELS] ?? a.toStatus}`}
                          </>
                        )}
                        {a.type === 'PROGRESS_UPDATE' && `Progress updated to ${a.progress}%`}
                        {a.type === 'NOTE' && (a.note ?? 'Note added')}
                        {a.type === 'WORKER_ADDED' && (a.note ?? 'Worker assigned')}
                        {a.type === 'WORKER_REMOVED' && (a.note ?? 'Worker removed')}
                        {!['STATUS_CHANGE', 'PROGRESS_UPDATE', 'NOTE', 'WORKER_ADDED', 'WORKER_REMOVED'].includes(a.type) &&
                          (a.note ?? a.type)}
                      </p>
                      {a.note &&
                        ['STATUS_CHANGE'].includes(a.type) &&
                        a.note !== 'Task created' && (
                          <p className="mt-0.5 text-xs text-slate-500">{a.note}</p>
                        )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.user.name} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4 lg:col-span-1">
          {/* Task details */}
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-bold text-ink">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-ink text-right">
                  {TASK_TYPE_LABELS[task.taskType as keyof typeof TASK_TYPE_LABELS] ?? task.taskType}
                </dd>
              </div>
              {task.productionOrder && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Factory size={12} />
                    Prod. Order
                  </dt>
                  <dd className="text-right">
                    <Link
                      href={`/production/${task.productionOrder.id}`}
                      className="font-mono text-xs font-bold text-brand-700 hover:underline"
                    >
                      {task.productionOrder.productionNumber}
                    </Link>
                  </dd>
                </div>
              )}
              {task.plannedStartAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Calendar size={12} />
                    Start
                  </dt>
                  <dd className="font-medium text-ink text-right">
                    {formatDate(task.plannedStartAt)}
                  </dd>
                </div>
              )}
              {task.plannedEndAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Calendar size={12} />
                    Due
                  </dt>
                  <dd className={cn(
                    'font-medium text-right',
                    new Date(task.plannedEndAt) < new Date() && task.status !== 'DONE'
                      ? 'text-rose-600'
                      : 'text-ink',
                  )}>
                    {formatDate(task.plannedEndAt)}
                  </dd>
                </div>
              )}
              {task.startedAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-slate-500">Started</dt>
                  <dd className="font-medium text-ink text-right">
                    {formatDate(task.startedAt)}
                  </dd>
                </div>
              )}
              {task.completedAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-slate-500">Completed</dt>
                  <dd className="font-medium text-emerald-700 text-right">
                    {formatDate(task.completedAt)}
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-600 text-right text-xs">{timeAgo(task.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Workers */}
          <div className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <User size={14} className="text-slate-400" />
              Assigned Workers
            </h2>
            {task.workers.length === 0 ? (
              <p className="text-sm text-slate-400">No workers assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {task.workers.map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{w.staffMember.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {w.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {task.notes && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-bold text-ink">Notes</h2>
              <p className="text-sm text-slate-600">{task.notes}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
