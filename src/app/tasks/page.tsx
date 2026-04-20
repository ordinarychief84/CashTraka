import Link from 'next/link';
import {
  Plus,
  ClipboardList,
  LayoutList,
  Columns3,
  AlertCircle,
  Calendar,
  User2,
  Check,
} from 'lucide-react';
import { guardWithFeature } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { TaskRowActions } from '@/components/TaskRowActions';
import { TaskQuickCheck } from '@/components/TaskQuickCheck';
import { TaskKanban, type KanbanTask } from '@/components/TaskKanban';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const priorityBadge: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-owed-50 text-owed-700 border-owed-200',
  normal: 'bg-slate-100 text-slate-600 border-slate-200',
  low: 'bg-slate-50 text-slate-400 border-slate-200',
};

const statusStyle: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-brand-50 text-brand-700',
  done: 'bg-success-50 text-success-700',
};

const statusLabel: Record<string, string> = {
  todo: 'To-do',
  in_progress: 'In progress',
  done: 'Done',
};

function isOverdue(dueIso: string | Date | null, status: string) {
  if (!dueIso || status === 'done') return false;
  const t = typeof dueIso === 'string' ? new Date(dueIso).getTime() : dueIso.getTime();
  return t < Date.now() - 24 * 60 * 60 * 1000;
}

type SP = {
  filter?: string;
  q?: string;
  view?: 'list' | 'board';
  assignee?: string;
  overdue?: '1';
};

/**
 * Tasks page.
 *
 * Two views:
 *   - List (default): grouped by status with overdue surfaced up top.
 *   - Board: three-column kanban with drag-drop between To-do / In progress / Done.
 *
 * Filters via query params: ?filter= status, ?q= title search, ?assignee= staffId
 * or 'me', ?overdue=1 for overdue-only.
 */
export default async function TasksPage({ searchParams }: { searchParams: SP }) {
  const user = await guardWithFeature('tasks');

  const view = searchParams.view === 'board' ? 'board' : 'list';
  const filter = searchParams.filter || 'all';
  const q = (searchParams.q || '').trim();
  const assignee = searchParams.assignee || 'all';
  const onlyOverdue = searchParams.overdue === '1';

  // Staff only see tasks assigned to them — they are "workers" of their
  // owner's tasks, not co-owners of the full task list. Owners / Managers
  // see everything.
  const isStaffPrincipal = !user.isOwner && user.staffId;

  const [allTasks, staff] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: user.id,
        ...(isStaffPrincipal ? { assignedToId: user.staffId ?? undefined } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.staffMember.findMany({
      where: { userId: user.id, status: 'active' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  // Stats (unfiltered — the whole picture is always in the header)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  const totalCount = allTasks.length;
  const todoCount = allTasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = allTasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = allTasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const doneThisWeek = allTasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt >= weekStart,
  ).length;

  // Filter pipeline
  let filtered = allTasks;
  if (filter === 'todo' || filter === 'in_progress' || filter === 'done') {
    filtered = filtered.filter((t) => t.status === filter);
  }
  if (assignee === 'me') {
    filtered = filtered.filter((t) => t.assignedToId == null);
  } else if (assignee !== 'all') {
    filtered = filtered.filter((t) => t.assignedToId === assignee);
  }
  if (onlyOverdue) {
    filtered = filtered.filter((t) => isOverdue(t.dueDate, t.status));
  }
  if (q) {
    const lower = q.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(lower));
  }

  // Build the "current URL with overrides" helper so we keep other filters
  // when toggling view/assignee/etc. `overdue: null` drops the flag;
  // omitting it preserves the current value.
  type LinkOver = {
    filter?: string;
    q?: string;
    view?: 'list' | 'board';
    assignee?: string;
    overdue?: '1' | null;
  };
  function link(over: LinkOver): string {
    const params = new URLSearchParams();
    const nextFilter = over.filter ?? filter;
    const nextQ = over.q ?? q;
    const nextView = over.view ?? view;
    const nextAssignee = over.assignee ?? assignee;
    const nextOverdue =
      over.overdue === null ? false : over.overdue === '1' ? true : onlyOverdue;

    if (nextFilter && nextFilter !== 'all') params.set('filter', nextFilter);
    if (nextQ) params.set('q', nextQ);
    if (nextView && nextView !== 'list') params.set('view', nextView);
    if (nextAssignee && nextAssignee !== 'all') params.set('assignee', nextAssignee);
    if (nextOverdue) params.set('overdue', '1');
    const qs = params.toString();
    return '/tasks' + (qs ? `?${qs}` : '');
  }

  const kanbanTasks: KanbanTask[] = filtered.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as KanbanTask['status'],
    priority: t.priority as KanbanTask['priority'],
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assignedTo: t.assignedTo ? { name: t.assignedTo.name } : null,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={isStaffPrincipal ? 'My Tasks' : 'Task Management'}
        subtitle={
          isStaffPrincipal
            ? 'Work assigned to you. Tap a task to mark it done.'
            : 'Create, assign and track tasks across your team.'
        }
        action={
          <Link href="/tasks/new" className="btn-primary">
            <Plus size={18} />
            Add task
          </Link>
        }
      />

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={String(totalCount)} />
        <StatCard label="To-do" value={String(todoCount)} />
        <StatCard label="In progress" value={String(inProgressCount)} tone="brand" />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? 'danger' : 'neutral'}
          sub={overdueCount > 0 ? 'needs attention' : undefined}
        />
      </div>

      {/* Toolbar — view toggle + filter tabs + search */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-full border border-border bg-white p-1 text-xs font-semibold">
            <Link
              href={link({ view: 'list' })}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                view === 'list' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
              )}
            >
              <LayoutList size={12} />
              List
            </Link>
            <Link
              href={link({ view: 'board' })}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 transition',
                view === 'board' ? 'bg-brand-500 text-white' : 'text-slate-600 hover:text-ink',
              )}
            >
              <Columns3 size={12} />
              Board
            </Link>
          </div>

          {/* Status tabs — hidden in board view since it shows all */}
          {view === 'list' && (
            <div className="flex gap-1 overflow-x-auto">
              {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => {
                const label = f === 'all' ? 'All' : statusLabel[f];
                const active = filter === f;
                return (
                  <Link
                    key={f}
                    href={link({ filter: f })}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-border bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Overdue-only toggle */}
          <Link
            href={link({ overdue: onlyOverdue ? null : '1' })}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
              onlyOverdue
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-border bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <AlertCircle size={12} />
            Overdue {overdueCount > 0 && `(${overdueCount})`}
          </Link>

          {/* Search */}
          <form className="ml-auto" method="get" action="/tasks">
            {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
            {view !== 'list' && <input type="hidden" name="view" value={view} />}
            {assignee !== 'all' && <input type="hidden" name="assignee" value={assignee} />}
            {onlyOverdue && <input type="hidden" name="overdue" value="1" />}
            <input
              name="q"
              type="search"
              placeholder="Search tasks…"
              defaultValue={q}
              className="input w-full sm:w-56"
            />
          </form>
        </div>

        {/* Assignee filter row */}
        {staff.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Assignee
            </span>
            <AssigneeChip label="All" active={assignee === 'all'} href={link({ assignee: 'all' })} />
            <AssigneeChip
              label="Me (owner)"
              active={assignee === 'me'}
              href={link({ assignee: 'me' })}
            />
            {staff.map((s) => (
              <AssigneeChip
                key={s.id}
                label={s.name}
                active={assignee === s.id}
                href={link({ assignee: s.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Empty / no-match states ── */}
      {allTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Create your first task to start tracking work. Assign to yourself or a team member, add a due date, and pick a priority."
          actionHref="/tasks/new"
          actionLabel="Add task"
        />
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">No tasks match your filter.</p>
          <Link
            href="/tasks"
            className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
          >
            Reset filters
          </Link>
        </div>
      ) : view === 'board' ? (
        <TaskKanban tasks={kanbanTasks} />
      ) : (
        <TaskListView
          tasks={filtered}
          staffById={new Map(staff.map((s) => [s.id, s.name]))}
          viewerIsStaff={Boolean(isStaffPrincipal)}
        />
      )}
    </AppShell>
  );
}

function AssigneeChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-border bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      <User2 size={10} />
      {label}
    </Link>
  );
}

/** List view split into Overdue → To-do → In progress → Done for scannability. */
function TaskListView({
  tasks,
  staffById,
  viewerIsStaff,
}: {
  tasks: Awaited<ReturnType<typeof prisma.task.findMany>>;
  /** Staff map so completion attribution can resolve the name. */
  staffById: Map<string, string>;
  /** When true (cashier/manager), clicking the checkbox opens the note dialog. */
  viewerIsStaff: boolean;
}) {
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status));
  const remaining = tasks.filter((t) => !isOverdue(t.dueDate, t.status));
  const buckets: { key: string; label: string; items: typeof tasks }[] = [
    { key: 'overdue', label: 'Overdue', items: overdue },
    { key: 'todo', label: 'To-do', items: remaining.filter((t) => t.status === 'todo') },
    {
      key: 'in_progress',
      label: 'In progress',
      items: remaining.filter((t) => t.status === 'in_progress'),
    },
    { key: 'done', label: 'Done', items: remaining.filter((t) => t.status === 'done') },
  ];

  return (
    <div className="space-y-5">
      {buckets.map((b) =>
        b.items.length === 0 ? null : (
          <section key={b.key}>
            <h2
              className={cn(
                'mb-2 text-[10px] font-bold uppercase tracking-wider',
                b.key === 'overdue' ? 'text-red-700' : 'text-slate-500',
              )}
            >
              {b.label}
              <span className="ml-1 font-normal text-slate-400">({b.items.length})</span>
            </h2>
            <ul className="space-y-2">
              {b.items.map((t) => (
                <TaskListRow
                  key={t.id}
                  task={t}
                  staffById={staffById}
                  viewerIsStaff={viewerIsStaff}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

function TaskListRow({
  task,
  staffById,
  viewerIsStaff,
}: {
  task: Awaited<ReturnType<typeof prisma.task.findMany>>[number] & {
    assignedTo?: { name: string } | null;
  };
  staffById: Map<string, string>;
  viewerIsStaff: boolean;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const doneBy =
    task.status === 'done' && task.completedByKind === 'staff' && task.completedById
      ? staffById.get(task.completedById) ?? 'Staff'
      : task.status === 'done' && task.completedByKind === 'owner'
        ? 'Owner'
        : null;
  return (
    <li
      className={cn(
        'card p-3',
        overdue ? 'border-red-200 ring-1 ring-red-100' : '',
      )}
    >
      <div className="flex items-start gap-3">
        <TaskQuickCheck
          id={task.id}
          done={task.status === 'done'}
          title={task.title}
          promptOnComplete={viewerIsStaff}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}/edit`}
            className={cn(
              'block font-semibold leading-tight',
              task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink',
            )}
          >
            {task.title}
          </Link>
          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
              {task.description}
            </p>
          )}
          {/* Completion attribution — visible to the owner when the task is done */}
          {task.status === 'done' && doneBy && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
              <Check size={10} />
              Done by {doneBy}
              {task.completedAt && (
                <span className="font-normal opacity-70">
                  {' '}
                  · {formatDate(task.completedAt)}
                </span>
              )}
            </p>
          )}
          {task.completionNote && (
            <p className="mt-1 text-xs text-slate-600">
              &ldquo;{task.completionNote}&rdquo;
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-semibold capitalize',
                priorityBadge[task.priority] || priorityBadge.normal,
              )}
            >
              {task.priority}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 font-semibold',
                statusStyle[task.status] || statusStyle.todo,
              )}
            >
              {statusLabel[task.status] || task.status}
            </span>
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-semibold',
                  overdue
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-border bg-white text-slate-600',
                )}
              >
                {overdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
                Due {formatDate(task.dueDate)}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 rounded border border-border bg-white px-1.5 py-0.5 font-semibold text-slate-600">
              <User2 size={10} />
              {task.assignedTo ? task.assignedTo.name : 'You'}
            </span>
          </div>
        </div>
        <TaskRowActions id={task.id} status={task.status} />
      </div>
    </li>
  );
}
