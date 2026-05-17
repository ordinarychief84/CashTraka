'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, BookOpen, Factory } from 'lucide-react';
import { ImageUploader } from '@/components/showroom/ImageUploader';
import { cn } from '@/lib/utils';

type Initial = {
  id?: string;
  name?: string;
  price?: number;
  cost?: number | null;
  stock?: number;
  trackStock?: boolean;
  lowStockAt?: number;
  note?: string;
  images?: string[];
  sku?: string | null;
  description?: string | null;
  nafdacNumber?: string | null;
  shelfLifeDays?: number | null;
  archived?: boolean;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

type Tab = 'basic' | 'catalog' | 'production';

/**
 * Tabbed product intake form. Splits the schema into three concerns so a
 * seller adding their first product doesn't see a 30-field wall:
 *
 *   Basic       — name, price, stock, the everyday case.
 *   Catalog     — SKU, public description, photos. Surface for the storefront.
 *   Production  — NAFDAC number, shelf life. Drives label compliance and
 *                 auto-expiry stamping when production starts.
 *
 * The "Active" toggle in the header maps to `archived` (inverted) so a
 * seller can deactivate without leaving the form.
 */
export function ProductForm({ redirectTo = '/products', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [tab, setTab] = useState<Tab>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
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
  const [note, setNote] = useState(initial?.note ?? '');
  const [active, setActive] = useState(!(initial?.archived ?? false));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);

  const [sku, setSku] = useState(initial?.sku ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [nafdacNumber, setNafdacNumber] = useState(initial?.nafdacNumber ?? '');
  const [shelfLifeDays, setShelfLifeDays] = useState<string>(
    initial?.shelfLifeDays != null ? String(initial.shelfLifeDays) : '',
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name cannot be blank.');
      setTab('basic');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Price must be greater than 0.');
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
      description,
      nafdacNumber,
      shelfLifeDays: shelfLifeDays === '' ? undefined : Number(shelfLifeDays),
    };
    try {
      const saveRes = await fetch(
        editing ? `/api/products/${initial!.id}` : '/api/products',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Could not save');

      // If editing, sync the archived flag separately when toggled.
      if (editing && active === (initial?.archived ?? false)) {
        await fetch(`/api/products/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: !active }),
        });
      }
      toast.success(initial?.id ? 'Product updated' : 'Product saved');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const tabs: { key: Tab; label: string; Icon: typeof Info }[] = [
    { key: 'basic', label: 'Basic information', Icon: Info },
    { key: 'catalog', label: 'Catalog', Icon: BookOpen },
    { key: 'production', label: 'Production', Icon: Factory },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header — Active toggle + product name */}
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Product name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type product name"
            className="mt-1 w-full border-0 border-b border-border bg-transparent px-0 py-1.5 text-lg font-semibold text-ink placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-0"
            required
          />
          {error && name.trim().length === 0 && (
            <p className="mt-1 text-xs text-rose-600">Name cannot be blank.</p>
          )}
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <span>Active</span>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="sr-only peer"
          />
          <span className="relative inline-block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-500">
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-white">
          <nav className="flex overflow-x-auto" aria-label="Form sections">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2',
                  tab === t.key
                    ? 'border-brand-500 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
                aria-selected={tab === t.key}
                role="tab"
              >
                <t.Icon size={16} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {tab === 'basic' && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Sale price (₦)</label>
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
                    <label className="label">Cost to you (₦)</label>
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

                <div className="rounded-lg border border-border bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={trackStock}
                      onChange={(e) => setTrackStock(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                    />
                    <span>
                      <span className="font-medium text-ink">Track stock</span>
                      <span className="block text-xs text-slate-600">
                        Auto-decrement when you attach this to an order or
                        payment.
                      </span>
                    </span>
                  </label>
                  {trackStock && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Current stock</label>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Alert when below</label>
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

                <div>
                  <label className="label">Internal note (not visible to customers)</label>
                  <input
                    type="text"
                    className="input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Only 50ml bottles"
                  />
                </div>
              </div>
            )}

            {tab === 'catalog' && (
              <div className="space-y-4">
                <div>
                  <label className="label">SKU / EAN</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SWR-2024"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Printed on labels and shown on the catalog page.
                  </p>
                </div>
                <div>
                  <label className="label">Description (public)</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this product for customers"
                  />
                </div>
              </div>
            )}

            {tab === 'production' && (
              <div className="space-y-4">
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
                    Surfaces on labels / customer-facing receipts when set.
                    Leave blank for products that don't need NAFDAC.
                  </p>
                </div>
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
                    When a production run for this product starts, the
                    expiry is auto-stamped to start date + this many days.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — photos */}
          <div className="md:col-span-1">
            <label className="label">Photos</label>
            <ImageUploader
              value={images}
              onChange={setImages}
              maxFiles={8}
              onError={(msg) => setError(msg)}
              hint="The first image is the card thumbnail. Up to 8 images."
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(redirectTo)}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting
            ? 'Saving…'
            : editing
              ? 'Save changes'
              : 'Save product'}
        </button>
      </div>
    </form>
  );
}
