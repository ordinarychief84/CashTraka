'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function VerifyEmailForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && next.every((d) => d)) {
      submitCode(next.join(''));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && \!digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (\!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    if (pasted.length === 6) {
      submitCode(pasted);
    } else {
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  async function submitCode(code: string) {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (\!res.ok) throw new Error(data.error || 'Verification failed');
      // Success — go to onboarding
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
      setVerifying(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-otp', { method: 'POST' });
      const data = await res.json();
      if (\!res.ok) throw new Error(data.error || 'Could not resend');
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend');
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      {/* 6-digit input grid */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={verifying}
            className="h-12 w-11 rounded-lg border border-border bg-white text-center text-xl font-bold text-ink shadow-xs transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50 md:h-14 md:w-12"
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {verifying && (
        <p className="mt-3 text-center text-sm text-slate-500">Verifying…</p>
      )}

      {/* Resend button */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={resendCode}
          disabled={resending || resendCooldown > 0 || verifying}
          className="text-sm font-semibold text-brand-700 underline hover:text-brand-800 disabled:text-slate-400 disabled:no-underline"
        >
          {resending
            ? 'Sending…'
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
