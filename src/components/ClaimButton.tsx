'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export function ClaimButton({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState('submitting');
    setError(null);
    try {
      const res = await fetch(`/api/payments/claim/${encodeURIComponent(code)}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      setState('done');
      // Reload so server component renders the "claimed" state.
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setState('error');
      setError('Could not record your confirmation. Please try again.');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={submit}
        disabled={state === 'submitting' || state === 'done'}
        className="btn-primary w-full"
      >
        {state === 'submitting' ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending…
          </>
        ) : state === 'done' ? (
          <>
            <Check size={16} />
            Confirmed
          </>
        ) : (
          <>I’ve made the payment</>
        )}
      </button>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
