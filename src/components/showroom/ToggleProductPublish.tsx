'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = { productId: string; initial: boolean };

export function ToggleProductPublish({ productId, initial }: Props) {
  const router = useRouter();
  const [published, setPublished] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !published;
    setError(null);
    setPublished(next);
    try {
      const res = await fetch(`/api/products/${productId}/catalog`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPublished: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? 'Update failed');
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setPublished(!next);
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          published
            ? 'inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700 hover:bg-success-100 disabled:opacity-60'
            : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60'
        }
      >
        {published ? 'Unpublish' : 'Publish'}
      </button>
      {error ? <span className="mt-1 text-[10px] text-red-600">{error}</span> : null}
    </div>
  );
}
