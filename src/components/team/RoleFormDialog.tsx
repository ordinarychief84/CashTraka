'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Palette } from 'lucide-react';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ASSIGNABLE_ROLES, type AccessRole } from '@/lib/rbac';

type RoleData = {
  id?: string;
  name: string;
  description: string;
  baseRole: string;
  color: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRole?: RoleData | null;
};

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6b7280', // gray
];

export function RoleFormDialog({ open, onClose, onSaved, editingRole }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseRole, setBaseRole] = useState<AccessRole>('CASHIER');
  const [color, setColor] = useState<string | null>(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editingRole?.id);

  useEffect(() => {
    if (open && editingRole) {
      setName(editingRole.name);
      setDescription(editingRole.description || '');
      setBaseRole(editingRole.baseRole as AccessRole);
      setColor(editingRole.color);
    } else if (open) {
      setName('');
      setDescription('');
      setBaseRole('CASHIER');
      setColor(PRESET_COLORS[0]);
    }
    setError(null);
  }, [open, editingRole]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Role name must be at least 2 characters');
      setSubmitting(false);
      return;
    }

    try {
      const url = isEdit ? `/api/team/roles/${editingRole!.id}` : '/api/team/roles';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          baseRole,
          color,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Shield size={18} />
            <span className="text-base font-bold">
              {isEdit ? 'Edit role' : 'Create a role'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Role name */}
          <div>
            <label htmlFor="role-name" className="label">Role name</label>
            <input
              id="role-name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shop Attendant, Delivery Rider"
              required
              minLength={2}
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="role-desc" className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              id="role-desc"
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role"
              maxLength={200}
            />
          </div>

          {/* Permission level */}
          <div>
            <label className="label">Permission level</label>
            <p className="mb-2 text-[11px] text-slate-500">
              What can people in this role do in the app?
            </p>
            <div className="space-y-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <label
                  key={r}
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ' +
                    (baseRole === r
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-border hover:bg-slate-50')
                  }
                >
                  <input
                    type="radio"
                    name="baseRole"
                    value={r}
                    checked={baseRole === r}
                    onChange={() => setBaseRole(r)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-bold text-ink">{ROLE_LABELS[r]}</div>
                    <div className="text-[11px] text-slate-600">{ROLE_DESCRIPTIONS[r]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Palette size={14} />
              Color tag <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? null : c)}
                  className={
                    'h-7 w-7 rounded-full border-2 transition ' +
                    (color === c ? 'border-ink scale-110 ring-2 ring-brand-200' : 'border-transparent hover:scale-110')
                  }
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn-primary w-full"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
