import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { TaskRowActions } from '@/components/TaskRowActions';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const priorityStyle: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-owed-50 text-owed-700',
  normal: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-50 text-slate-400',
};

const statusStyle: Record<string, string> = {
  todo: 'badge-pending',
  in_progress: 'badge bg-brand-50 text-brand-700',
  done: 'badge-paid',
};

const statusLabel: Record<string, string> = {
  todo: 'To-do',
  in_progress: 'In progress',
  done: 'Done',
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string };
}) {
  const user = await guard();

  const filter = searchParams.filter || 'all';
  const q = searchParams.q || '';

  // Stat counts
  const allTasks = await prisma.task.findMany({
    where: { userId: user.id },
    include: { assignedTo: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });

  // Current week boundaries (Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  const doneThisWeek = allTasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt >= weekStart,
  ).length;

  const totalCount = allTasks.length;
  const todoCount = allTasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = allTasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = allTasks.filter((t) => t.status === 'done').length;

  // Filter
  let filtered = allTasks;
  if (filter === 'todo') filtered = filtered.filter((t) => t.status === 'todo');
  else if (filter === 'in_progress') filtered = filtered.filter((t) => t.status === 'in_progress');
  else if (filter === 'done') filtered = filtered.filter((t) => t.status === 'done');

  // Search
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(lower));
  }

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader
        title="Tasks"
        subtitle="Track what needs doing and who is on it."
        action={
          <Link href="/tasks/new" className="btn-primary">
            <Plus size={18} />
            Add task
          </Link>
        }
      />

      {/* Stat row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total tasks" value={String(totalCount)} />
        <StatCard label="To-do" value={String(todoCount)} />
        <StatCard label="In progress" value={String(inProgressCount)} tone="brand" />
        <StatCard label="Done this week" value={String(doneThisWeek)} tone="brand" />
      </div>

      {/* Filter tabs + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => {
            const label = f === 'all' ? 'All' : statusLabel[f];
            const isActive = filter === f;
            return (
              <Link
                key={f}
                href={`/tasks?filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition',
                  isActive
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-border bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <form className="flex" method="get" action="/tasks">
          <input type="hidden" name="filter" value={filter} />
          <input
            name="q"
            type="search"
            placeholder="Search tasks..."
            defaultValue={q}
            className="input w-full sm:w-56"
          />
        </form>
      </div>

      {/* Task list */}
      {allTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Create your first task to start tracking work."
          actionHref="/tasks/new"
          actionLabel="Add task"
        />
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">No tasks match your filter.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((task) => (
            <li key={task.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'truncate font-semibold',
                        task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink',
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {/* Priority badge */}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-medium capitalize',
                        priorityStyle[task.priority] || priorityStyle.normal,
                      )}
                    >
                      {task.priority}
                    </span>
                    {/* Status badge */}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-medium',
                        statusStyle[task.status] || statusStyle.todo,
                      )}
                    >
                      {statusLabel[task.status] || task.status}
                    </span>
                    {/* Assigned to */}
                    <span className="text-slate-500">
                      {task.assignedTo ? task.assignedTo.name : 'You'}
                    </span>
                    {/* Due date */}
                    {task.dueDate && (
                      <span className="text-slate-500">
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <TaskRowActions id={task.id} status={task.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
