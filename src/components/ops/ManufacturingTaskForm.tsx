'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ProductionOrderOption = {
  id: string;
  productionNumber: string;
  title: string | null;
  status: string;
};

type StaffOption = {
  id: string;
  name: string;
  role: string | null;
};

type Props = {
  productionOrders: ProductionOrderOption[];
  staffMembers: StaffOption[];
  defaultProductionOrderId?: string;
  initial?: {
    id?: string;
    title?: string;
    description?: string | null;
    taskType?: string;
    priority?: string;
    productionOrderId?: string | null;
    targetQty?: number | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    notes?: string | null;
    workerIds?: string[];
  };
};

const TASK_TYPES = [
  { value: 'MIXING', label: 'Mixing' },
  { value: 'CUTTING', label: 'Cutting' },
  { value: 'SEWING', label: 'Sewing' },
  { value: 'ASSEMBLY', label: 'Assembly' },
  { value: 'WELDING', label: 'Welding' },
  { value: 'BAKING', label: 'Baking' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'LABELLING', label: 'Labelling' },
  { value: 'QC_INSPECTION', label: 'QC Inspection' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function ManufacturingTaskForm({ productionOrders, staffMembers, defaultProductionOrderId, initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initial?.workerIds ?? []);

  function toggleWorker(id: string) {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get('title') || ''),
      description: String(form.get('description') || '') || null,
      taskType: String(form.get('taskType') || 'OTHER'),
      priority: String(form.get('priority') || 'NORMAL'),
      productionOrderId: String(form.get('productionOrderId') || '') || null,
      targetQty: form.get('targetQty') ? Number(form.get('targetQty')) : null,
      plannedStartAt: form.get('plannedStartAt') ? new Date(String(form.get('plannedStartAt'))).toISOString() : null,
      plannedEndAt: form.get('plannedEndAt') ? new Date(String(form.get('plannedEndAt'))).toISOString() : null,
      notes: String(form.get('notes') || '') || null,
      workerIds: selectedWorkers,
    };

    try {
      const res = await fetch(
        editing ? `/api/manufacturing-tasks/${initial!.id}` : '/api/manufacturing-tasks',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save task');
      toast.success(editing ? 'Task updated' : 'Task created');
      router.push('/manufacturing-tasks');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="label">Task title</label>
        <input
          id="title"
          name="title"
          className="input"
          placeholder="e.g. Mix Batch A — Shea butter soap"
          defaultValue={initial?.title ?? ''}
          required
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="label">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-[80px] resize-y"
          placeholder="Instructions, ingredients, process notes…"
          defaultValue={initial?.description ?? ''}
          maxLength={2000}
        />
      </div>

      {/* Task type + Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="taskType" className="label">Task type</label>
          <select id="taskType" name="taskType" className="input" defaultValue={initial?.taskType ?? 'OTHER'}>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="label">Priority</label>
          <select id="priority" name="priority" className="input" defaultValue={initial?.priority ?? 'NORMAL'}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Production order link */}
      <div>
        <label htmlFor="productionOrderId" className="label">
          Link to production order <span className="text-slate-400">(optional)</span>
        </label>
        <select
          id="productionOrderId"
          name="productionOrderId"
          className="input"
          defaultValue={initial?.productionOrderId ?? defaultProductionOrderId ?? ''}
        >
          <option value="">— Standalone task —</option>
          {productionOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.productionNumber}{po.title ? ` · ${po.title}` : ''} [{po.status}]
            </option>
          ))}
        </select>
      </div>

      {/* Target quantity */}
      <div>
        <label htmlFor="targetQty" className="label">
          Target quantity <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="targetQty"
          name="targetQty"
          type="number"
          min={1}
          className="input"
          placeholder="e.g. 50"
          defaultValue={initial?.targetQty ?? ''}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="plannedStartAt" className="label">
            Planned start <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="plannedStartAt"
            name="plannedStartAt"
            type="date"
            className="input"
            defaultValue={initial?.plannedStartAt?.slice(0, 10) ?? ''}
          />
        </div>
        <div>
          <label htmlFor="plannedEndAt" className="label">
            Due date <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="plannedEndAt"
            name="plannedEndAt"
            type="date"
            className="input"
            defaultValue={initial?.plannedEndAt?.slice(0, 10) ?? ''}
          />
        </div>
      </div>

      {/* Assign workers */}
      {staffMembers.length > 0 && (
        <div>
          <span className="label">
            Assign workers <span className="text-slate-400">(optional)</span>
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {staffMembers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleWorker(s.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  selectedWorkers.includes(s.id)
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-border bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {s.name}
                {s.role ? ` · ${s.role}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="label">
          Notes <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input min-h-[60px] resize-y"
          placeholder="Additional notes for the team…"
          defaultValue={initial?.notes ?? ''}
          maxLength={2000}
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
      </button>
    </form>
  );
}
