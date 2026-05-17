'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck, Repeat2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MaterialOption = {
  id: string;
  name: string;
  unit: string;
  unitCostKobo: number;
};
type RecipeItemInitial = {
  materialId: string;
  quantity: number;
  wastageAllowancePercent?: number;
  substituteAllowed?: boolean;
  substituteMaterialId?: string | null;
  notes?: string | null;
};
type RecipeInitial = {
  yieldQty: number;
  recipeName?: string | null;
  outputUnit?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  versionNumber?: number;
  notes?: string | null;
  items: RecipeItemInitial[];
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  DRAFT: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-slate-100 text-slate-700',
};

export function RecipeEditor({
  productId,
  productName,
  materials,
  initial,
}: {
  productId: string;
  productName: string;
  materials: MaterialOption[];
  initial: RecipeInitial | null;
}) {
  const router = useRouter();
  const [yieldQty, setYieldQty] = useState<number>(initial?.yieldQty ?? 1);
  const [recipeName, setRecipeName] = useState<string>(
    initial?.recipeName ?? '',
  );
  const [outputUnit, setOutputUnit] = useState<string>(
    initial?.outputUnit ?? '',
  );
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>(
    initial?.status ?? 'ACTIVE',
  );
  const [bumpVersion, setBumpVersion] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<RecipeItemInitial[]>(
    initial?.items?.length
      ? initial.items.map((it) => ({
          ...it,
          wastageAllowancePercent: it.wastageAllowancePercent ?? 0,
          substituteAllowed: it.substituteAllowed ?? false,
        }))
      : [
          {
            materialId: materials[0]?.id ?? '',
            quantity: 1,
            wastageAllowancePercent: 0,
            substituteAllowed: false,
            notes: '',
          },
        ],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setItem(i: number, patch: Partial<RecipeItemInitial>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }
  function addItem() {
    const usedIds = new Set(items.map((i) => i.materialId));
    const next = materials.find((m) => !usedIds.has(m.id));
    setItems((prev) => [
      ...prev,
      {
        materialId: next?.id ?? '',
        quantity: 1,
        wastageAllowancePercent: 0,
        substituteAllowed: false,
        notes: '',
      },
    ]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Cost with wastage allowance baked in.
  const batchCostKobo = items.reduce((sum, it) => {
    const m = materials.find((x) => x.id === it.materialId);
    if (!m) return sum;
    const wastage = (it.wastageAllowancePercent ?? 0) / 100;
    return sum + Math.round(m.unitCostKobo * it.quantity * (1 + wastage));
  }, 0);
  const unitCostNaira =
    yieldQty > 0 ? Math.round(batchCostKobo / 100 / yieldQty) : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Add at least one material.');
      return;
    }
    if (new Set(items.map((i) => i.materialId)).size !== items.length) {
      setError('Each material can only appear once.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yieldQty,
          recipeName: recipeName.trim() || undefined,
          outputUnit: outputUnit.trim() || undefined,
          status,
          bumpVersion,
          notes: notes || undefined,
          items: items.map((it) => ({
            materialId: it.materialId,
            quantity: it.quantity,
            wastageAllowancePercent: it.wastageAllowancePercent ?? 0,
            substituteAllowed: it.substituteAllowed ?? false,
            substituteMaterialId: it.substituteMaterialId || undefined,
            notes: it.notes || undefined,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to save';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('Recipe saved');
      router.push(`/recipes`);
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Header — name, version, status */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Recipe name
          </label>
          <input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="input"
            placeholder={`Default: ${productName}`}
          />
        </div>
        <div className="sm:w-40">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'DRAFT' | 'ACTIVE' | 'ARCHIVED')
            }
            className="input"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              STATUS_TONE[status],
            )}
          >
            v{initial?.versionNumber ?? 1}
            {bumpVersion && initial ? ` → v${(initial.versionNumber ?? 1) + 1}` : ''}
          </span>
          {initial && (
            <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={bumpVersion}
                onChange={(e) => setBumpVersion(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-500"
              />
              Bump version
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Batch yield
          </label>
          <input
            type="number"
            min={1}
            value={yieldQty}
            onChange={(e) => setYieldQty(Math.max(1, Number(e.target.value)))}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">
            One batch produces this many units of {productName}.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Output unit
          </label>
          <input
            value={outputUnit}
            onChange={(e) => setOutputUnit(e.target.value)}
            className="input"
            placeholder='e.g. "bottles", "loaves"'
          />
        </div>
        <div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Estimated unit cost
            </p>
            <p className="num mt-1 text-xl font-black text-emerald-900">
              ₦{unitCostNaira.toLocaleString('en-NG')}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Materials needed
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >
            <Plus size={12} /> Add material
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((it, i) => {
            const m = materials.find((x) => x.id === it.materialId);
            const wastage = (it.wastageAllowancePercent ?? 0) / 100;
            const lineCostKobo = m
              ? Math.round(m.unitCostKobo * it.quantity * (1 + wastage))
              : 0;
            return (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Material
                    </label>
                    <select
                      value={it.materialId}
                      onChange={(e) =>
                        setItem(i, { materialId: e.target.value })
                      }
                      className="input"
                    >
                      <option value="">— Select —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        setItem(i, {
                          quantity: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="input"
                    />
                    {m && (
                      <p className="mt-1 text-xs text-slate-400">
                        {m.unit} per batch
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Wastage %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={it.wastageAllowancePercent ?? 0}
                      onChange={(e) =>
                        setItem(i, {
                          wastageAllowancePercent: Math.max(
                            0,
                            Math.min(100, Number(e.target.value)),
                          ),
                        })
                      }
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Line cost
                    </label>
                    <p className="num pt-2 text-sm font-bold text-slate-700">
                      ₦
                      {Math.round(lineCostKobo / 100).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="flex items-end justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Substitute row — collapsed by default */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                    <Repeat2 size={11} className="-mt-0.5 mr-1 inline" />
                    Substitute / fallback (optional)
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-4 flex items-center">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={it.substituteAllowed ?? false}
                          onChange={(e) =>
                            setItem(i, {
                              substituteAllowed: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 accent-brand-500"
                        />
                        Allow substitute
                      </label>
                    </div>
                    <div className="sm:col-span-8">
                      <select
                        value={it.substituteMaterialId ?? ''}
                        onChange={(e) =>
                          setItem(i, {
                            substituteMaterialId: e.target.value || null,
                          })
                        }
                        disabled={!it.substituteAllowed}
                        className="input"
                      >
                        <option value="">— No fallback —</option>
                        {materials
                          .filter((m) => m.id !== it.materialId)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Recipe notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Mixing instructions, temperatures, anything worth remembering"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={12} />
          Only <strong>Active</strong> recipes feed the shortage engine.
        </div>
        <button type="submit" disabled={submitting} className="btn-pill-primary">
          {submitting ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </form>
  );
}
