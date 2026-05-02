'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUploader } from '@/components/showroom/ImageUploader';

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
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

export function ProductForm({ redirectTo = '/products', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? true);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const costRaw = String(form.get('cost') || '');
    const payload: Record<string, unknown> = {
      name: String(form.get('name') || ''),
      price: Number(form.get('price') || 0),
      cost: costRaw === '' ? undefined : Number(costRaw),
      stock: Number(form.get('stock') || 0),
      trackStock,
      lowStockAt: Number(form.get('lowStockAt') || 3),
      note: String(form.get('note') || ''),
      images,
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
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Images */}
      <div>
        <label className="label">Photos</label>
        <ImageUploader
          value={images}
          onChange={setImages}
          maxFiles={8}
          onError={(msg) => setError(msg)}
          hint="The first image becomes the product card thumbnail. Up to 8 images."
        />
      </div>

      <div>
        <label htmlFor="name" className="label">Product name</label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="e.g. Rose perfume 50ml"
          defaultValue={initial?.name ?? ''}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="price" className="label">Sale price (₦)</label>
          <input
            id="price"
            name="price"
            type="number"
            min={1}
            className="input"
            placeholder="e.g. 8500"
            defaultValue={initial?.price ?? ''}
            required
          />
        </div>
        <div>
          <label htmlFor="cost" className="label">Cost to you (₦)</label>
          <input
            id="cost"
            name="cost"
            type="number"
            min={0}
            className="input"
            placeholder="optional"
            defaultValue={initial?.cost ?? ''}
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
              Auto-decrement when you attach this to a payment.
            </span>
          </span>
        </label>
        {trackStock && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="stock" className="label">Current stock</label>
              <input
                id="stock"
                name="stock"
                type="number"
                min={0}
                className="input"
                defaultValue={initial?.stock ?? 0}
              />
            </div>
            <div>
              <label htmlFor="lowStockAt" className="label">Alert when below</label>
              <input
                id="lowStockAt"
                name="lowStockAt"
                type="number"
                min={0}
                className="input"
                defaultValue={initial?.lowStockAt ?? 3}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input
          id="note"
          name="note"
          className="input"
          placeholder="e.g. Only 50ml bottles"
          defaultValue={initial?.note ?? ''}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save product'}
      </button>
    </form>
  );
}
