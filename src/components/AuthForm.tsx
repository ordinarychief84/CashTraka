'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { type BusinessType } from '@/lib/business-type';
import {
  PASSWORD_RULES,
  PASSWORD_MAX_LENGTH,
  checkPasswordRules,
} from '@/lib/password-policy';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  // Landlord vertical removed — businessType is always 'seller'. The
  // ?type= / ?ic= params are accepted but ignored.
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('seller');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const ruleState = checkPasswordRules(password);
  const allRulesPass =
    mode !== 'signup' ||
    PASSWORD_RULES.every((r) => ruleState[r.key]);
  const showRules = mode === 'signup' && (passwordFocused || password.length > 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (mode === 'signup' && !allRulesPass) {
      setError('Password does not meet all the requirements yet.');
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
      payload.confirmPassword = String(form.get('confirmPassword') || '');
      payload.businessType = businessType;
      payload.termsAccepted = termsAccepted;

      // Client-side password match check
      if (payload.password !== payload.confirmPassword) {
        setError('Passwords do not match');
        setSubmitting(false);
        return;
      }
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
      const kind = data?.data?.kind;
      const redirectTo = data?.data?.redirectTo;
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
      // Admin staff get redirected to admin dashboard
      if (kind === 'admin_staff' && redirectTo) dest = redirectTo;

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
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" name="name" className="input" required placeholder="e.g. Ada Eze" />
        </div>
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
            className={cn(
              'input pr-10',
              mode === 'signup' &&
                password.length > 0 &&
                !allRulesPass &&
                'ring-1 ring-rose-300 focus:ring-rose-400',
            )}
            required
            minLength={mode === 'signup' ? 8 : 1}
            maxLength={mode === 'signup' ? PASSWORD_MAX_LENGTH : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
            aria-describedby={mode === 'signup' ? 'password-rules' : undefined}
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
        {showRules && (
          <ul
            id="password-rules"
            className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            role="status"
            aria-live="polite"
          >
            {PASSWORD_RULES.map((rule) => {
              const ok = ruleState[rule.key];
              return (
                <li
                  key={rule.key}
                  className={cn(
                    'flex items-start gap-1.5',
                    ok ? 'text-emerald-700' : 'text-rose-600',
                  )}
                >
                  {ok ? (
                    <Check size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <X size={14} className="mt-0.5 shrink-0" />
                  )}
                  <span>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Confirm password, signup only */}
      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className="input pr-10"
              required
              minLength={8}
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Terms & Privacy checkbox, signup only */}
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
