'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Initial = {
  id?: string;
  name?: string;
  body?: string;
};

type Props = {
  initial?: Initial;
  redirectTo?: string;
};

export function TemplateForm({ initial, redirectTo = '/templates' }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name') || ''),
      body: String(form.get('body') || ''),
    };
    try {
      const res = await fetch(
        editing ? `/api/templates/${initial!.id}` : '/api/templates',
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
        <label htmlFor="name" className="label">Template name</label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="e.g. Delivery confirmation"
          defaultValue={initial?.name ?? ''}
          required
        />
      </div>
      <div>
        <label htmlFor="body" className="label">Message body</label>
        <textarea
          id="body"
          name="body"
          rows={6}
          className="input"
          placeholder="Hi {name}, your order has been packed and will be delivered today. Thanks for shopping with us!"
          defaultValue={initial?.body ?? ''}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Tip: use <code className="rounded bg-slate-100 px-1">{'{name}'}</code> to insert the customer’s name automatically.
        </p>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save template'}
      </button>
    </form>
  );
}
