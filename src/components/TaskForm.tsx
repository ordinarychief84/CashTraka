'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type StaffOption = { id: string; name: string; role: string | null };

type Initial = {
  id?: string;
  title?: string;
  description?: string | null;
  assignedToId?: string | null;
  priority?: string;
  dueDate?: string | null;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

export function TaskForm({ redirectTo = '/tasks', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStaff(data);
      })
      .catch(() => {});
  }, []);

  // Format date for the date input (YYYY-MM-DD)
  function formatDateForInput(d: string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      title: String(form.get('title') || ''),
      description: String(form.get('description') || ''),
      priority: String(form.get('priority') || 'normal'),
      assignedToId: String(form.get('assignedToId') || ''),
      dueDate: String(form.get('dueDate') || ''),
    };

    try {
      const res = await fetch(
        editing ? `/api/tasks/${initial!.id}` : '/api/tasks',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="label">
          Task title
        </label>
        <input
          id="title"
          name="title"
          className="input"
          placeholder="e.g. Restock shelves"
          defaultValue={initial?.title ?? ''}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-[80px]"
          placeholder="Add more details..."
          defaultValue={initial?.description ?? ''}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="priority" className="label">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            className="input"
            defaultValue={initial?.priority ?? 'normal'}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label htmlFor="assignedToId" className="label">
            Assign to
          </label>
          <select
            id="assignedToId"
            name="assignedToId"
            className="input"
            defaultValue={initial?.assignedToId ?? ''}
          >
            <option value="">Me</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.role ? ` (${s.role})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="dueDate" className="label">
          Due date (optional)
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          className="input"
          defaultValue={formatDateForInput(initial?.dueDate)}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving...' : editing ? 'Save changes' : 'Create task'}
      </button>
    </form>
  );
}
