'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Calendar, User2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskQuickCheck } from './TaskQuickCheck';
import { TaskRowActions } from './TaskRowActions';

/**
 * Kanban view for tasks.
 *
 * Three columns (To-do / In progress / Done). Each card is draggable between
 * columns via the native HTML5 drag-drop API — no dependency on a DnD library.
 * Status changes are POSTed optimistically and the server is the source of truth;
 * a failed PATCH just reverts the UI on refresh.
 */

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string | null; // ISO
  assignedTo: { name: string } | null;
};

type ColumnKey = KanbanTask['status'];
const COLUMNS: { key: ColumnKey; label: string; tone: string }[] = [
  { key: 'todo', label: 'To-do', tone: 'bg-slate-100 text-slate-700' },
  { key: 'in_progress', label: 'In progress', tone: 'bg-brand-50 text-brand-700' },
  { key: 'done', label: 'Done', tone: 'bg-emerald-50 text-emerald-700' },
];

const PRIORITY: Record<string, { label: string; tone: string }> = {
  urgent: { label: 'Urgent', tone: 'bg-red-50 text-red-700 border-red-200' },
  high: { label: 'High', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  normal: { label: 'Normal', tone: 'bg-slate-50 text-slate-500 border-slate-200' },
  low: { label: 'Low', tone: 'bg-slate-50 text-slate-400 border-slate-200' },
};

function isOverdue(dueIso: string | null, status: string): boolean {
  if (!dueIso || status === 'done') return false;
  return new Date(dueIso).getTime() < Date.now() - 24 * 60 * 60 * 1000;
}

function dueLabel(dueIso: string | null): string {
  if (!dueIso) return '';
  const d = new Date(dueIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays}d`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export function TaskKanban({ tasks }: { tasks: KanbanTask[] }) {
  const router = useRouter();
  const [local, setLocal] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnKey | null>(null);

  async function moveCard(id: string, toStatus: ColumnKey) {
    const card = local.find((t) => t.id === id);
    if (!card || card.status === toStatus) return;
    // Optimistic update
    setLocal((prev) => prev.map((t) => (t.id === id ? { ...t, status: toStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      });
      if (!res.ok) throw new Error('patch failed');
      router.refresh();
    } catch {
      // Revert on error
      setLocal((prev) => prev.map((t) => (t.id === id ? { ...t, status: card.status } : t)));
    }
  }

  function onDragStart(id: string) {
    return (e: React.DragEvent) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    };
  }

  function onDragOver(col: ColumnKey) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverCol !== col) setDragOverCol(col);
    };
  }

  function onDrop(col: ColumnKey) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const id = dragId || e.dataTransfer.getData('text/plain');
      setDragId(null);
      setDragOverCol(null);
      if (id) void moveCard(id, col);
    };
  }

  function onDragEnd() {
    setDragId(null);
    setDragOverCol(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = local.filter((t) => t.status === col.key);
        const isDropTarget = dragOverCol === col.key;
        return (
          <div
            key={col.key}
            className={cn(
              'rounded-2xl border bg-slate-50/60 p-3 transition',
              isDropTarget ? 'border-brand-500 bg-brand-50/60' : 'border-border',
            )}
            onDragOver={onDragOver(col.key)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={onDrop(col.key)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className={
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ' +
                  col.tone
                }
              >
                {col.label}
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/70 px-1 text-[10px] text-slate-700">
                  {colTasks.length}
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {colTasks.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                  Drop here
                </li>
              ) : (
                colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    dragging={dragId === t.id}
                    onDragStart={onDragStart(t.id)}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: KanbanTask;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const p = PRIORITY[task.priority] || PRIORITY.normal;

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-xl border bg-white p-3 shadow-xs transition cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
        overdue ? 'border-red-200 ring-1 ring-red-100' : 'border-border hover:border-slate-300',
      )}
    >
      <div className="flex items-start gap-2">
        <TaskQuickCheck id={task.id} done={task.status === 'done'} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}/edit`}
            className={cn(
              'block text-sm font-semibold leading-tight',
              task.status === 'done' ? 'text-slate-400 line-through' : 'text-ink',
            )}
          >
            {task.title}
          </Link>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={
                'inline-flex items-center rounded border px-1.5 py-0.5 font-semibold ' +
                p.tone
              }
            >
              {p.label}
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
                {dueLabel(task.dueDate)}
              </span>
            )}
            {task.assignedTo && (
              <span className="inline-flex items-center gap-0.5 rounded border border-border bg-white px-1.5 py-0.5 font-semibold text-slate-600">
                <User2 size={10} />
                {task.assignedTo.name}
              </span>
            )}
          </div>
        </div>
        <div className="opacity-0 transition group-hover:opacity-100">
          <TaskRowActions id={task.id} status={task.status} />
        </div>
      </div>
    </li>
  );
}
