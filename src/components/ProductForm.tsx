'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Info,
  Cpu,
  Boxes,
  ImagePlus,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Users,
  Search,
} from 'lucide-react';
import { ImageUploader } from '@/components/showroom/ImageUploader';
import { cn } from '@/lib/utils';

type CustomerOpt = { id: string; name: string; phone?: string | null };

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
  customers?: CustomerOpt[];
};

type Tab = 'basic' | 'technology' | 'rawmaterial';

export function ProductForm({ redirectTo = '/products', initial, customers = [] }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [tab, setTab] = useState<Tab>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Basic
  const [name, setName] = useState(initial?.name ?? '');
  const [active, setActive] = useState(!(initial?.archived ?? false));
  const [category, setCategory] = useState(initial?.category ?? '');
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientOpen, setClientOpen] = useState(false);
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [unitOfSale, setUnitOfSale] = useState(initial?.unitOfSale ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [price, setPrice] = useState<string>(
    initial?.price != null ? String(initial.price) : '',
  );
  const [cost, setCost] = useState<string>(
    initial?.cost != null ? String(initial.cost) : '',
  );
  const [stock, setStock] = useState<string>(
    initial?.stock != null ? String(initial.stock) : '0',
  );
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? true);
  const [lowStockAt, setLowStockAt] = useState<string>(
    initial?.lowStockAt != null ? String(initial.lowStockAt) : '3',
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);

  // Technology
  const [nafdacNumber, setNafdacNumber] = useState(initial?.nafdacNumber ?? '');
  const [shelfLifeDays, setShelfLifeDays] = useState<string>(
    initial?.shelfLifeDays != null ? String(initial.shelfLifeDays) : '',
  );
  const [barcodeValue, setBarcodeValue] = useState(initial?.barcodeValue ?? '');
  const [canBeProduced, setCanBeProduced] = useState(initial?.canBeProduced ?? false);
  const [batchTracking, setBatchTracking] = useState(initial?.batchTracking ?? false);
  const [expiryTracking, setExpiryTracking] = useState(initial?.expiryTracking ?? false);
  const [defaultBatchSize, setDefaultBatchSize] = useState<string>(
    initial?.defaultBatchSize != null ? String(initial.defaultBatchSize) : '',
  );
  const [leadTimeDays, setLeadTimeDays] = useState<string>(
    initial?.defaultProductionLeadTimeDays != null
      ? String(initial.defaultProductionLeadTimeDays)
      : '',
  );
  const [minSellQty, setMinSellQty] = useState<string>(
    initial?.minimumSellingQuantity != null ? String(initial.minimumSellingQuantity) : '',
  );

  const clientSuggestions = useMemo(() => {
    if (!clientName.trim() || !customers.length) return [];
    const q = clientName.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [clientName, customers]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setNameError(false);

    if (!name.trim()) {
      setNameError(true);
      setTab('basic');
      return;
    }
    if (!price || Number(price) <= 0) {
      setGlobalError('Sale price must be greater than 0.');
      setTab('basic');
      return;
    }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      price: Number(price),
      cost: cost === '' ? undefined : Number(cost),
      stock: Number(stock || 0),
      trackStock,
      lowStockAt: Number(lowStockAt || 3),
      note,
      images,
      sku,
      barcodeValue,
      description,
      category,
      unitOfSale,
      minimumSellingQuantity: minSellQty === '' ? undefined : Number(minSellQty),
      defaultBatchSize: defaultBatchSize === '' ? undefined : Number(defaultBatchSize),
      defaultProductionLeadTimeDays: leadTimeDays === '' ? undefined : Number(leadTimeDays),
      canBeProduced,
      batchTracking,
      expiryTracking,
      nafdacNumber,
      shelfLifeDays: shelfLifeDays === '' ? undefined : Number(shelfLifeDays),
      clientName: clientName.trim() || undefined,
      archived: !active,
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
      toast.success(editing ? 'Product updated' : 'Product saved');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setGlobalError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const tabs: { key: Tab; label: string; note: string; icon: typeof Info }[] = [
    { key: 'basic', label: 'Basic Information', note: 'Optional', icon: Info },
    { key: 'technology', label: 'Technology', note: 'Optional', icon: Cpu },
    { key: 'rawmaterial', label: 'Raw Material', note: 'Optional', icon: Boxes },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* ── Sticky header bar ── */}
      <div className="card mb-0 rounded-b-none border-b-0 px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Product name */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-sm font-semibold text-slate-500">Product name :</span>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                placeholder="Type here product name"
                className={cn(
                  'w-full border-0 border-b-2 bg-transparent px-0 py-1 text-base font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-0 transition-colors',
                  nameError ? 'border-rose-400' : 'border-slate-200 focus:border-brand-500',
                )}
              />
              {nameError && (
                <p className="mt-0.5 text-xs text-rose-600">Name cannot be blank.</p>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
            <span>Active :</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <span className="relative inline-block h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand-500">
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition duration-200 peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="card rounded-t-none overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border bg-slate-50">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'group relative inline-flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-semibold transition',
                tab === t.key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700',
              )}
              aria-selected={tab === t.key}
              role="tab"
            >
              {tab === t.key ? (
                <CheckCircle2 size={15} className="text-brand-500" />
              ) : (
                <t.icon size={15} className="text-slate-400 group-hover:text-slate-500" />
              )}
              <span>{t.label}</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                {t.note}
              </span>
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        {/* ── BASIC INFORMATION ── */}
        {tab === 'basic' && (
          <div className="grid gap-0 lg:grid-cols-3">
            {/* Left — fields */}
            <div className="space-y-5 p-6 lg:col-span-2 lg:border-r lg:border-border">

              {/* Product group */}
              <div>
                <label className="label">Product group / Category</label>
                <input
                  type="text"
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Soap, Cake, Furniture"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {['Skincare', 'Food', 'Beverage', 'Furniture', 'Fashion', 'Packaging', 'Other'].map(
                    (c) => <option key={c} value={c} />,
                  )}
                </datalist>
              </div>

              {/* Client / Customer */}
              <div className="relative">
                <label className="label">
                  <Users size={13} className="mr-1 inline-block text-slate-400" />
                  Client
                  <span className="ml-1.5 text-slate-400 font-normal">(private-label or custom order)</span>
                </label>
                {/* Input with magnifying-glass prefix */}
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="input pl-9"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setClientOpen(true); }}
                    onFocus={() => setClientOpen(true)}
                    onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                    placeholder="Select client"
                    autoComplete="off"
                  />
                </div>
                {clientOpen && clientSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-white shadow-lg">
                    {clientSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={() => { setClientName(c.name); setClientOpen(false); }}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-brand-50 transition"
                        >
                          <span className="font-medium text-ink">{c.name}</span>
                          {c.phone && (
                            <span className="ml-2 text-xs text-slate-400">{c.phone}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Stored as a name snapshot. Helps you filter products by client later.
                </p>
              </div>

              {/* SKU / EAN + Unit of sale */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">SKU / EAN code</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SWR-2024"
                  />
                </div>
                <div>
                  <label className="label">Unit / Size</label>
                  <input
                    type="text"
                    className="input"
                    value={unitOfSale}
                    onChange={(e) => setUnitOfSale(e.target.value)}
                    placeholder="e.g. 200ml bottle, pack of 6"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">
                  Product description{' '}
                  <span className="text-slate-400">(visible on invoices &amp; orders)</span>
                </label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this product — printed on invoices and order confirmations"
                />
              </div>

              {/* Internal note */}
              <div>
                <label className="label">
                  Internal notes{' '}
                  <span className="text-slate-400">(not visible to customers)</span>
                </label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Only available in 50ml bottles — do not substitute"
                />
              </div>

              {/* Pricing */}
              <div>
                <label className="label">Pricing</label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Sale price (₦) *</label>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 8500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Cost to produce (₦)</label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="optional"
                    />
                  </div>
                </div>
              </div>

              {/* Stock tracking */}
              <div className="rounded-lg border border-border bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={trackStock}
                    onChange={(e) => setTrackStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-brand-500"
                  />
                  <span>
                    <span className="font-semibold text-ink">Track stock levels</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Auto-decrement when this product is sold or shipped.
                    </span>
                  </span>
                </label>
                {trackStock && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Current stock</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Alert when below</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        value={lowStockAt}
                        onChange={(e) => setLowStockAt(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {globalError && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {globalError}
                </div>
              )}
            </div>

            {/* Right — images */}
            <div className="flex flex-col gap-4 p-6 lg:col-span-1">
              <div>
                <label className="label mb-2">
                  <ImagePlus size={14} className="mr-1 inline-block text-slate-400" />
                  Product images
                </label>
                <ImageUploader
                  value={images}
                  onChange={setImages}
                  maxFiles={8}
                  onError={(msg) => setGlobalError(msg)}
                  hint="First image is the card thumbnail. Up to 8 photos."
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TECHNOLOGY ── */}
        {tab === 'technology' && (
          <div className="grid gap-0 lg:grid-cols-3">
            <div className="space-y-5 p-6 lg:col-span-2">

              {/* NAFDAC */}
              <div>
                <label className="label">NAFDAC number</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={nafdacNumber}
                  onChange={(e) => setNafdacNumber(e.target.value)}
                  placeholder="e.g. A1-2401L"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Printed on labels and customer-facing receipts when set. Leave blank if not applicable.
                </p>
              </div>

              {/* Shelf life + Barcode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Default shelf life (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={36500}
                    className="input"
                    value={shelfLifeDays}
                    onChange={(e) => setShelfLifeDays(e.target.value)}
                    placeholder="e.g. 180"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Expiry is auto-stamped on production batches.
                  </p>
                </div>
                <div>
                  <label className="label">Barcode value (EAN / QR)</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    placeholder="e.g. 5901234123457"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used for label printing and scanning.
                  </p>
                </div>
              </div>

              {/* Production flags */}
              <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Production settings</p>

                {[
                  {
                    id: 'canBeProduced',
                    checked: canBeProduced,
                    onChange: setCanBeProduced,
                    label: 'Can be produced in-house',
                    sub: 'Enables production planning and batch costing for this product.',
                  },
                  {
                    id: 'batchTracking',
                    checked: batchTracking,
                    onChange: setBatchTracking,
                    label: 'Batch tracking',
                    sub: 'A batch number must be entered when production is completed.',
                  },
                  {
                    id: 'expiryTracking',
                    checked: expiryTracking,
                    onChange: setExpiryTracking,
                    label: 'Expiry tracking',
                    sub: 'Each produced unit carries an expiry date stamped at production.',
                  },
                ].map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={f.checked}
                      onChange={(e) => f.onChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                    />
                    <span>
                      <span className="font-medium text-ink">{f.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{f.sub}</span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Batch size + Lead time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Default batch size (units)</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={defaultBatchSize}
                    onChange={(e) => setDefaultBatchSize(e.target.value)}
                    placeholder="e.g. 50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Suggested quantity pre-filled in production forms.
                  </p>
                </div>
                <div>
                  <label className="label">Production lead time (days)</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    placeholder="e.g. 3"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used to suggest a ready-by date on orders.
                  </p>
                </div>
              </div>

              {/* Minimum selling qty */}
              <div>
                <label className="label">
                  Minimum selling quantity{' '}
                  <span className="text-slate-400">(bulk orders only)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  className="input w-full sm:w-48"
                  value={minSellQty}
                  onChange={(e) => setMinSellQty(e.target.value)}
                  placeholder="e.g. 6"
                />
              </div>
            </div>

            <div className="hidden p-6 lg:col-span-1 lg:block">
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
                <p className="font-semibold">Technology fields</p>
                <p className="mt-1 text-xs text-brand-700">
                  These settings drive production compliance, label printing, and batch costing.
                  Fill them in once and they&apos;ll pre-fill every production run for this product.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── RAW MATERIAL ── */}
        {tab === 'rawmaterial' && (
          <div className="p-6">
            {editing ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Define the raw materials needed to produce one batch of this product.
                  Recipes drive your shortage alerts, purchase orders, and batch cost calculations.
                </p>
                <a
                  href={`/recipes/${initial!.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition"
                >
                  <Boxes size={15} />
                  Manage Recipe / Bill of Materials
                  <ExternalLink size={12} className="opacity-60" />
                </a>
                <p className="text-xs text-slate-400">
                  Opens the recipe editor in a new view. Return here to continue editing product details.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Boxes size={40} className="text-slate-300" />
                <p className="font-semibold text-slate-600">Save the product first</p>
                <p className="max-w-xs text-sm text-slate-500">
                  After saving, you can return here to add the raw materials (recipe) for this product.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition"
          >
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save product'}
          </button>
        </div>
      </div>
    </form>
  );
}
