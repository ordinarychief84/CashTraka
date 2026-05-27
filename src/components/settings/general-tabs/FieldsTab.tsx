'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Trash2, Loader2 } from 'lucide-react';

export type EntityType = 'ITEM' | 'CUSTOMER' | 'SUPPLIER' | 'PURCHASING' | 'SALES';
export type FieldType = 'TEXT' | 'TEXT_LONG' | 'NUMBER' | 'DATE' | 'CHECKBOX';

export interface CustomFieldRow {
  id: string;
  entityType: EntityType;
  fieldType: FieldType;
  name: string;
  availableInLayouts: boolean;
}

interface Props {
  initialRows: CustomFieldRow[];
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Text (max. 255 characters)',
  TEXT_LONG: 'Long text',
  NUMBER: 'Number',
  DATE: 'Date',
  CHECKBOX: 'Checkbox',
};

const SUB_TABS: { id: EntityType; label: string; panel: string; emptyNoun: string }[] = [
  { id: 'ITEM',       label: 'Item',       panel: 'Item fields',       emptyNoun: 'items'    },
  { id: 'CUSTOMER',   label: 'Customer',   panel: 'Customer fields',   emptyNoun: 'customers'},
  { id: 'SUPPLIER',   label: 'Supplier',   panel: 'Supplier fields',   emptyNoun: 'suppliers'},
  { id: 'PURCHASING', label: 'Purchasing', panel: 'Purchasing fields', emptyNoun: 'purchase documents' },
  { id: 'SALES',      label: 'Sales',      panel: 'Sales fields',      emptyNoun: 'sales documents'    },
];

const inputCls =
  'h-9 w-full rounded-md border border-slate-300 px-3 text-[13px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300';

export function FieldsTab({ initialRows }: Props) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<EntityType>('ITEM');
  const [rows, setRows] = useState<CustomFieldRow[]>(initialRows);
  const [openCreate, setOpenCreate] = useState(false);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => rows.filter((r) => r.entityType === subTab), [rows, subTab]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this field? Stored values on existing records will be hidden.')) return;
    const res = await fetch(`/api/settings/custom-fields/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      startTransition(() => router.refresh());
    }
  }

  function onCreated(row: CustomFieldRow) {
    setRows((prev) => [...prev, row]);
    setOpenCreate(false);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {/* Entity sub-tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 overflow-x-auto">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
              subTab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-brand-700">
            {SUB_TABS.find((t) => t.id === subTab)?.panel}
          </p>
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={13} />
            Create field
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center text-[13px] text-slate-500">
            No custom fields for {SUB_TABS.find((t) => t.id === subTab)?.emptyNoun} yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">In layouts</th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{FIELD_TYPE_LABELS[r.fieldType]}</td>
                    <td className="px-4 py-3 text-slate-600">{r.availableInLayouts ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        title="Delete field"
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openCreate && (
        <CreateFieldModal
          entityType={subTab}
          onClose={() => setOpenCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

function CreateFieldModal({
  entityType,
  onClose,
  onCreated,
}: {
  entityType: EntityType;
  onClose: () => void;
  onCreated: (row: CustomFieldRow) => void;
}) {
  const [fieldType, setFieldType] = useState<FieldType>('TEXT');
  const [name, setName] = useState('');
  const [availableInLayouts, setAvailableInLayouts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          fieldType,
          name: name.trim(),
          availableInLayouts,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error ?? 'Could not create field.');
        return;
      }
      onCreated(json.data.customField);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-3 w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-[15px] font-semibold text-slate-900">Create field</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Field type</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
              className={`${inputCls} pr-8 bg-white`}
            >
              <option value="TEXT">{FIELD_TYPE_LABELS.TEXT}</option>
              <option value="TEXT_LONG">{FIELD_TYPE_LABELS.TEXT_LONG}</option>
              <option value="NUMBER">{FIELD_TYPE_LABELS.NUMBER}</option>
              <option value="DATE">{FIELD_TYPE_LABELS.DATE}</option>
              <option value="CHECKBOX">{FIELD_TYPE_LABELS.CHECKBOX}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={availableInLayouts}
              onChange={(e) => setAvailableInLayouts(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Available in layouts
          </label>

          {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Create field
          </button>
        </div>
      </div>
    </div>
  );
}
