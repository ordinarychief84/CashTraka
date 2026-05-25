'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type Initial = {
  id?: string;
  name?: string;
  price?: number;
  cost?: number | null;
  stock?: number;
  trackStock?: boolean;
  lowStockAt?: number;
  safetyStock?: number | null;
  note?: string;
  images?: string[];
  sku?: string | null;
  barcodeValue?: string | null;
  description?: string | null;
  category?: string | null;
  unitOfSale?: string | null;
  minimumSellingQuantity?: number | null;
  defaultBatchSize?: number | null;
  defaultProductionLeadTimeDays?: number | null;
  canBeProduced?: boolean;
  batchTracking?: boolean;
  expiryTracking?: boolean;
  nafdacNumber?: string | null;
  shelfLifeDays?: number | null;
  archived?: boolean;
  clientName?: string | null;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
  customers?: { id: string; name: string; phone?: string | null }[];
};

// ── Currency detection ─────────────────────────────────────────────────────────

function detectCurrencySymbol(): string {
  if (typeof navigator === 'undefined') return '₦';
  const lang = (navigator.language || 'en-NG').toLowerCase();
  if (lang === 'en-us' || lang.startsWith('en-us')) return '$';
  if (lang === 'en-gb' || lang.startsWith('en-gb')) return '£';
  if (lang.includes('-gh')) return '₵';
  if (lang.includes('-ke') || lang.includes('-tz') || lang.includes('-ug')) return 'KSh';
  if (lang.includes('-za')) return 'R';
  if (lang.includes('-in') || lang === 'hi') return '₹';
  if (lang.startsWith('ja')) return '¥';
  if (lang.startsWith('zh')) return '¥';
  if (
    lang.startsWith('de') || lang.startsWith('fr') || lang.startsWith('es') ||
    lang.startsWith('it') || lang.startsWith('nl') || lang === 'pt-pt'
  ) return '€';
  return '₦';
}

// ── Constants ──────────────────────────────────────────────────────────────────

const UNITS = ['stk.', 'pcs', 'kg', 'g', 'L', 'mL', 'box', 'pack', 'm', 'pair'];
const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];
const SIZE_UNITS = ['cm', 'mm', 'm', 'in', 'ft'];
const GROUP_SUGGESTIONS = [
  'Skincare', 'Food', 'Beverage', 'Furniture', 'Fashion', 'Packaging',
  'Electronics', 'Other',
];

// ── Presentational helpers ─────────────────────────────────────────────────────

function Label({ children, required, error }: {
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <label className={cn(
      'mb-0.5 block text-[12px] font-medium',
      error ? 'text-rose-600' : 'text-slate-600',
    )}>
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  error,
  disabled,
  className,
  list,
  type = 'text',
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  list?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      list={list}
      className={cn(
        'w-full rounded border px-3 py-1.5 text-[13px] outline-none transition',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : error
            ? 'border-rose-400 bg-rose-50/40 text-slate-800 focus:border-rose-400 focus:ring-1 focus:ring-rose-200'
            : 'border-slate-300 bg-white text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-200',
        className,
      )}
    />
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder ?? '0.00'}
      min="0"
      step="0.01"
      className={cn(
        'w-full rounded border px-3 py-1.5 text-[13px] outline-none transition',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : 'border-slate-300 bg-white text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-200',
        className,
      )}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: string[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full appearance-none rounded border px-3 py-1.5 pr-8 text-[13px] outline-none transition',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : 'border-slate-300 bg-white text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-200',
          className,
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M4 6h8L8 11z" />
      </svg>
    </div>
  );
}

function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  listId,
  error,
  disabled,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: string[];
  placeholder?: string;
  listId: string;
  error?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <div className={cn(
        'flex items-center rounded border transition',
        disabled
          ? 'border-slate-200 bg-slate-50'
          : error
            ? 'border-rose-400 bg-rose-50/40 focus-within:ring-1 focus-within:ring-rose-200'
            : 'border-slate-300 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200',
      )}>
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          list={listId}
          className={cn(
            'flex-1 rounded-l bg-transparent px-3 py-1.5 text-[13px] outline-none',
            disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800',
          )}
        />
        <svg
          className={cn('mr-2 h-3.5 w-3.5 shrink-0', disabled ? 'text-slate-300' : 'text-slate-400')}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M4 6h8L8 11z" />
        </svg>
      </div>
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[15px] font-bold text-blue-600">{children}</h3>
  );
}

function PercentReadout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          readOnly
          value={value}
          className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 pr-8 text-[13px] text-slate-600 outline-none"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProductForm({ redirectTo = '/products', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [submitting, setSubmitting] = useState(false);
  const [createAndNew, setCreateAndNew] = useState(false);
  const [currency, setCurrency] = useState('₦');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Detect currency on mount (client only to avoid hydration mismatch)
  useEffect(() => {
    setCurrency(detectCurrencySymbol());
  }, []);

  // ── General ────────────────────────────────────────────────────────────────
  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [barcodeValue, setBarcodeValue] = useState(initial?.barcodeValue ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [unit, setUnit] = useState(initial?.unitOfSale ?? 'stk.');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [nafdacNumber, setNafdacNumber] = useState(initial?.nafdacNumber ?? '');

  // ── Prices ─────────────────────────────────────────────────────────────────
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '0.00');
  const [cost, setCost] = useState(initial?.cost != null ? String(initial.cost) : '0.00');

  // ── Status ─────────────────────────────────────────────────────────────────
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [canBeProduced, setCanBeProduced] = useState(initial?.canBeProduced ?? false);

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [stock, setStock] = useState(initial?.stock != null ? String(initial.stock) : '0');
  const [minInventory, setMinInventory] = useState(
    initial?.lowStockAt != null ? String(initial.lowStockAt) : '0',
  );
  const [minPurchase, setMinPurchase] = useState(
    initial?.minimumSellingQuantity != null ? String(initial.minimumSellingQuantity) : '0',
  );

  // ── Weight (UI only — not persisted yet) ───────────────────────────────────
  const [weight, setWeight] = useState('0.00');
  const [weightUnit, setWeightUnit] = useState('kg');

  // ── Size (UI only — not persisted yet) ────────────────────────────────────
  const [width, setWidth] = useState('0.00');
  const [height, setHeight] = useState('0.00');
  const [depth, setDepth] = useState('0.00');
  const [sizeUnit, setSizeUnit] = useState('cm');

  // ── Derived ────────────────────────────────────────────────────────────────
  const profitPct = useMemo(() => {
    const p = parseFloat(price) || 0;
    const c = parseFloat(cost) || 0;
    if (p <= 0) return '0.00';
    return (((p - c) / p) * 100).toFixed(2);
  }, [price, cost]);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'The Name field is required.';
    if (!sku.trim()) errs.sku = 'The Number field is required.';
    if (!category.trim()) errs.category = 'The Group field is required when Group ID is not present.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function clearError(field: string) {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function doSubmit(redirectAfter: string) {
    setGlobalError(null);
    if (!validate()) return;

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || undefined,
      stock: parseInt(stock, 10) || 0,
      trackStock: parseInt(stock, 10) > 0 || parseInt(minInventory, 10) > 0,
      lowStockAt: parseInt(minInventory, 10) || 0,
      minimumSellingQuantity: parseInt(minPurchase, 10) || undefined,
      sku: sku.trim(),
      barcodeValue: barcodeValue.trim() || undefined,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      unitOfSale: unit.trim() || undefined,
      canBeProduced,
      nafdacNumber: nafdacNumber.trim() || undefined,
      archived,
    };

    try {
      const res = await fetch(
        editing ? `/api/products/${initial!.id}` : '/api/products',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      toast.success(editing ? 'Product updated' : 'Product created');
      router.push(redirectAfter);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(msg);
      toast.error(msg);
      setSubmitting(false);
      setCreateAndNew(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doSubmit(redirectTo);
  }

  async function handleCreateAndNew(e: React.MouseEvent) {
    e.preventDefault();
    setCreateAndNew(true);
    await doSubmit('/products/new');
    setCreateAndNew(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Tab bar */}
      <div className="mb-4 border-b border-slate-200">
        <button
          type="button"
          className="border-b-2 border-blue-600 px-4 pb-2 pt-1 text-[13px] font-semibold text-blue-600 focus:outline-none"
        >
          Information
        </button>
      </div>

      {/* Main card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="p-6">

            {/* GENERAL */}
            <SectionTitle>General</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              {/* Name */}
              <div className="col-span-1">
                <Label required error={!!errors.name}>Name</Label>
                <TextInput
                  value={name}
                  onChange={(v) => { setName(v); clearError('name'); }}
                  error={!!errors.name}
                />
                {errors.name && (
                  <p className="mt-0.5 text-[11px] text-rose-600">{errors.name}</p>
                )}
              </div>

              {/* Number / SKU */}
              <div className="col-span-1">
                <Label required error={!!errors.sku}>Number</Label>
                <TextInput
                  value={sku}
                  onChange={(v) => { setSku(v); clearError('sku'); }}
                  error={!!errors.sku}
                />
                {errors.sku && (
                  <p className="mt-0.5 text-[11px] text-rose-600">{errors.sku}</p>
                )}
              </div>

              {/* Barcode */}
              <div className="col-span-1">
                <Label>Barcode</Label>
                <TextInput
                  value={barcodeValue}
                  onChange={setBarcodeValue}
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-3">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-y rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>

            {/* Unit + Item group + Discount group */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <Label>Unit</Label>
                <ComboInput
                  value={unit}
                  onChange={setUnit}
                  options={UNITS}
                  listId="unit-opts"
                />
              </div>
              <div>
                <Label required error={!!errors.category}>Item group</Label>
                <ComboInput
                  value={category}
                  onChange={(v) => { setCategory(v); clearError('category'); }}
                  options={GROUP_SUGGESTIONS}
                  listId="group-opts"
                  error={!!errors.category}
                />
                {errors.category && (
                  <p className="mt-0.5 text-[11px] text-rose-600">{errors.category}</p>
                )}
              </div>
              <div>
                <Label>Discount group</Label>
                <ComboInput
                  value=""
                  options={[]}
                  listId="discount-opts"
                  placeholder="Select discount group"
                  disabled
                />
              </div>
            </div>

            {/* Default location + Default department + Primary supplier */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <Label>Default location</Label>
                <TextInput value="" placeholder="Select location" disabled />
              </div>
              <div>
                <Label>Default department</Label>
                <ComboInput
                  value=""
                  options={[]}
                  listId="dept-opts"
                  placeholder="Select department"
                  disabled
                />
              </div>
              <div>
                <Label>Primary supplier</Label>
                <ComboInput
                  value=""
                  options={[]}
                  listId="supplier-opts"
                  disabled
                />
              </div>
            </div>

            {/* Variation */}
            <div className="mt-3 w-1/2">
              <Label>Variation</Label>
              <ComboInput
                value=""
                options={[]}
                listId="variation-opts"
                disabled
              />
            </div>

            {/* NAFDAC number (Nigeria-specific) */}
            {nafdacNumber || (
              <input type="hidden" value="" />
            )}
            {/* Show NAFDAC if already set */}
            {editing && (
              <div className="mt-3">
                <Label>NAFDAC number</Label>
                <TextInput
                  value={nafdacNumber}
                  onChange={setNafdacNumber}
                  placeholder="e.g. A1-2401L"
                />
              </div>
            )}

            {/* PRICES */}
            <div className="mt-6">
              <SectionTitle>Prices</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sales price ({currency})</Label>
                  <NumberInput value={price} onChange={setPrice} />
                </div>
                <div>
                  <Label>Cost price ({currency})</Label>
                  <NumberInput value={cost} onChange={setCost} />
                </div>
                <div>
                  <Label>Rec. sales price ({currency})</Label>
                  <NumberInput value="0.00" disabled />
                </div>
                <div>
                  <Label>Expected cost price ({currency})</Label>
                  <NumberInput value="0.00" disabled />
                </div>
                <div>
                  <Label>Extra cost</Label>
                  <div className="relative">
                    <NumberInput value="0.00" disabled className="pr-8" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">%</span>
                  </div>
                </div>
                <PercentReadout label="Profit (%)" value={profitPct} />
              </div>
              <div className="mt-3 w-1/2">
                <PercentReadout label="Gross profit (%)" value={profitPct} />
              </div>
            </div>

            {/* STATUS */}
            <div className="mt-6">
              <p className="mb-2 text-[12px] font-medium text-slate-600">Status</p>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <span className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition',
                    !archived ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white',
                  )}>
                    {!archived && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-white">
                        <circle cx="5" cy="5" r="4" />
                      </svg>
                    )}
                  </span>
                  <input type="radio" name="status" className="sr-only" checked={!archived} onChange={() => setArchived(false)} />
                  <span className="text-[13px] text-slate-700">Open</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition',
                    archived ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white',
                  )}>
                    {archived && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-white">
                        <circle cx="5" cy="5" r="4" />
                      </svg>
                    )}
                  </span>
                  <input type="radio" name="status" className="sr-only" checked={archived} onChange={() => setArchived(true)} />
                  <span className="text-[13px] text-slate-700">Barred</span>
                </label>
              </div>
            </div>

            {/* Must assure quality */}
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={canBeProduced}
                  onChange={(e) => setCanBeProduced(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                <span className="text-[13px] text-slate-700">Must assure quality</span>
              </label>
            </div>

            {/* Global error */}
            {globalError && (
              <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {globalError}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting && !createAndNew}
                className="rounded bg-blue-600 px-6 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {editing
                  ? submitting ? 'Saving…' : 'Save changes'
                  : submitting && !createAndNew ? 'Creating…' : 'Create product'}
              </button>
              {!editing && (
                <button
                  type="button"
                  onClick={handleCreateAndNew}
                  disabled={submitting && createAndNew}
                  className="rounded border border-slate-300 bg-white px-6 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {submitting && createAndNew ? 'Creating…' : 'Create and new'}
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
          <div className="p-6">

            {/* INVENTORY */}
            <SectionTitle>Inventory</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>In stock</Label>
                <NumberInput
                  value={stock}
                  onChange={setStock}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Min. inventory quantity</Label>
                <NumberInput
                  value={minInventory}
                  onChange={setMinInventory}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Min. purchase quantity</Label>
                <NumberInput
                  value={minPurchase}
                  onChange={setMinPurchase}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Min. sales quantity</Label>
                <NumberInput value="0" disabled />
              </div>
            </div>

            {/* WEIGHT */}
            <div className="mt-6">
              <SectionTitle>Weight</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Weight</Label>
                  <NumberInput value={weight} onChange={setWeight} />
                </div>
                <div>
                  <Label>Weight unit</Label>
                  <SelectInput
                    value={weightUnit}
                    onChange={setWeightUnit}
                    options={WEIGHT_UNITS}
                  />
                </div>
              </div>
            </div>

            {/* SIZE */}
            <div className="mt-6">
              <SectionTitle>Size</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Width</Label>
                  <NumberInput value={width} onChange={setWidth} />
                </div>
                <div>
                  <Label>Height</Label>
                  <NumberInput value={height} onChange={setHeight} />
                </div>
                <div>
                  <Label>Depth</Label>
                  <NumberInput value={depth} onChange={setDepth} />
                </div>
                <div>
                  <Label>Size unit</Label>
                  <SelectInput
                    value={sizeUnit}
                    onChange={setSizeUnit}
                    options={SIZE_UNITS}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}
