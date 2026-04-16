'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/business-type';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const initialType =
    (params.get('type') as BusinessType) ||
    (params.get('ic') as BusinessType) ||
    'seller';
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialType === 'property_manager' ? 'property_manager' : 'seller',
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
    };
    if (mode === 'signup') {
      payload.name = String(form.get('name') || '');
      payload.businessType = businessType;
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');
      // Envelope: { success, data: { role, ... } }. Legacy signup returns { id, ... } at top level.
      const role =
        data?.data?.role ??
        (data && typeof data === 'object' && 'role' in data ? data.role : undefined);
      let dest = mode === 'signup' ? '/onboarding' : next;
      if (role === 'ADMIN') dest = '/admin/dashboard';
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <>
          <div>
            <label className="label">What kind of business do you run?</label>
            <div className="grid grid-cols-1 gap-2">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBusinessType(bt.value)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition',
                    businessType === bt.value
                      ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                      : 'border-border bg-white hover:border-brand-300 hover:bg-brand-50/20',
                  )}
                >
                  <span className="text-2xl leading-none">{bt.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{bt.label}</span>
                    <span className="block text-xs text-slate-500">{bt.description}</span>
                  </span>
                  <span
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 rounded-full border-2',
                      businessType === bt.value
                        ? 'border-brand-500 bg-brand-500 ring-2 ring-brand-100'
                        : 'border-slate-300',
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              We'll tailor your experience. You can change this anytime in settings.
            </p>
          </div>
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" name="name" className="input" required placeholder="e.g. Ada Eze" />
          </div>
        </>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" className="input" required placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === 'signup' ? 8 : 1}
          placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </form>
  );
}
