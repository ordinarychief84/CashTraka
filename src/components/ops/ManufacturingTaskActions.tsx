'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlayCircle, PauseCircle, CheckCircle2, XCircle, RotateCcw, UserPlus, UserMinus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/services/manufacturingTask.service';
import { TASK_STATUS_LABELS } from '@/lib/services/manufacturingTask.service';

type Worker = {
  id: string;
  staffMemberId: string;
  name: string;
  role: string;
};

type AvailableStaff = {
  id: string;
  name: string;
  role: string | null;
};

type Props = {
  taskId: string;
  currentStatus: TaskStatus;
  currentProgress: number;
  assignedWorkers: Worker[];
  availableStaff: AvailableStaff[];
};

const TRANSITIONS: Record<TaskStatus, { status: TaskStatus; label: string; icon: React.ElementType; tone: string }[]> = {
  PENDING: [
    { status: 'IN_PROGRESS', label: 'Start Task', icon: PlayCircle, tone: 'brand' },
    { status: 'ON_HOLD', label: 'Put On Hold', icon: PauseCircle, tone: 'amber' },
    { status: 'CANCELLED', label: 'Cancel', icon: XCircle, tone: 'rose' },
  ],
  IN_PROGRESS: [
    { status: 'DONE', label: 'Mark Done', icon: CheckCircle2, tone: 'emerald' },
    { status: 'ON_HOLD', label: 'Put On Hold', icon: PauseCircle, tone: 'amber' },
    { status: 'CANCELLED', label: 'Cancel', icon: XCircle, tone: 'rose' },
  ],
  ON_HOLD: [
    { status: 'IN_PROGRESS', label: 'Resume', icon: PlayCircle, tone: 'brand' },
    { status: 'PENDING', label: 'Reset to Pending', icon: RotateCcw, tone: 'neutral' },
    { status: 'CANCELLED', label: 'Cancel', icon: XCircle, tone: 'rose' },
  ],
  DONE: [],
  CANCELLED: [],
};

const TONE_CLASSES: Record<string, string> = {
  brand: 'border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100',
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  amber: 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100',
  rose: 'border-rose-500 bg-rose-50 text-rose-700 hover:bg-rose-100',
  neutral: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
};

export function ManufacturingTaskActions({
  taskId,
  currentStatus,
  currentProgress,
  assignedWorkers,
  availableStaff,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(currentProgress);
  const [addingWorker, setAddingWorker] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);
  const [completedQty, setCompletedQty] = useState('');

  const transitions = TRANSITIONS[currentStatus] ?? [];

  async function changeStatus(toStatus: TaskStatus, extra?: { completedQty?: number }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing-tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success(`Task ${TASK_STATUS_LABELS[toStatus]}`);
      setConfirmDone(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function updateProgress() {
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing-tasks/${taskId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');
      toast.success('Progress updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function addWorker() {
    if (!selectedStaff) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing-tasks/${taskId}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffMemberId: selectedStaff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign worker');
      toast.success('Worker assigned');
      setSelectedStaff('');
      setAddingWorker(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function removeWorker(staffMemberId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/manufacturing-tasks/${taskId}/workers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffMemberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove worker');
      toast.success('Worker removed');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const isTerminal = currentStatus === 'DONE' || currentStatus === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Status transitions */}
      {transitions.length > 0 && !isTerminal && (
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold text-ink">Actions</h2>

          {confirmDone ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">How many units were completed?</p>
              <input
                type="number"
                min={0}
                placeholder="Completed quantity (optional)"
                value={completedQty}
                onChange={(e) => setCompletedQty(e.target.value)}
                className="input w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    changeStatus('DONE', {
                      completedQty: completedQty ? Number(completedQty) : undefined,
                    })
                  }
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Saving…' : 'Confirm Done'}
                </button>
                <button
                  onClick={() => setConfirmDone(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map(({ status, label, icon: Icon, tone }) => (
                <button
                  key={status}
                  onClick={() => {
                    if (status === 'DONE') {
                      setConfirmDone(true);
                    } else {
                      changeStatus(status);
                    }
                  }}
                  disabled={loading}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
                    TONE_CLASSES[tone] ?? TONE_CLASSES.neutral,
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress slider — visible when IN_PROGRESS */}
      {currentStatus === 'IN_PROGRESS' && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <BarChart3 size={14} className="text-slate-400" />
              Update Progress
            </h2>
            <span className="num text-sm font-bold text-brand-700">{progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={updateProgress}
              disabled={loading || progress === currentProgress}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition',
                progress === currentProgress
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-500 text-white hover:bg-brand-600',
              )}
            >
              Save progress
            </button>
          </div>
        </div>
      )}

      {/* Worker assignment */}
      {!isTerminal && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Workers</h2>
            {availableStaff.length > 0 && (
              <button
                onClick={() => setAddingWorker(!addingWorker)}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                <UserPlus size={12} />
                Add
              </button>
            )}
          </div>

          {assignedWorkers.length === 0 && !addingWorker && (
            <p className="text-sm text-slate-400">No workers assigned.</p>
          )}

          {assignedWorkers.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {assignedWorkers.map((w) => (
                <li key={w.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{w.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {w.role}
                    </span>
                    <button
                      onClick={() => removeWorker(w.staffMemberId)}
                      disabled={loading}
                      className="text-slate-400 hover:text-rose-500"
                      title="Remove worker"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {addingWorker && availableStaff.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="input flex-1 text-sm"
              >
                <option value="">Select a worker…</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.role ? ` — ${s.role}` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={addWorker}
                disabled={!selectedStaff || loading}
                className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
