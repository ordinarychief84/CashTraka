'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialType === 'property_manager' ? 'property_manager' : 'seller',
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string | boolean> = {
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
    };
    if (mode === 'signup') {
      payload.name = String(form.get('name') || '');
      payload.businessType = businessType;
      payload.termsAccepted = termsAccepted;
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');

      const role =
        data?.data?.role ??
        (data && typeof data === 'object' && 'role' in data ? data.role : undefined);
      const requiresVerification =
        data?.data?.requiresVerification ?? data?.requiresVerification;

      let dest: string;
      if (mode === 'signup') {
        // New signup → email verification first
        dest = requiresVerification ? '/verify-email' : '/onboarding';
      } else {
        dest = next;
      }
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
            <label className="label">Choose your solution</label>
            <p className="mb-2 text-xs text-slate-500">
              Pick the product that matches what you do. You can change it later.
            </p>
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
                    <span className="block text-sm font-semibold text-ink">{bt.productName}</span>
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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="input pr-10"
            required
            minLength={mode === 'signup' ? 8 : 1}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Terms & Privacy checkbox — signup only */}
      {mode === 'signup' && (
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setError(null);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600 leading-snug">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              className="font-semibold text-brand-700 underline hover:text-brand-800"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-brand-700 underline hover:text-brand-800"
            >
              Privacy Policy
            </Link>
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </form>
  );
}
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-brand-700 underline hover:text-brand-800"
            >
              Privacy Policy
            </Link>
          </span>
        </label>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </form>
  );
}
