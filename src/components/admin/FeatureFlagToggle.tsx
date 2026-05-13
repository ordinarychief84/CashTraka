'use client';

import { useState, useTransition } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

export function FeatureFlagToggle({
  flagKey,
  initialValue,
}: {
  flagKey: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !value;
    setError(null);
    setValue(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/feature-flags', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: flagKey, value: next }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || body.success === false) {
          setValue(!next); // rollback
          setError(body.error || 'Failed to update');
        }
      } catch (e) {
        setValue(!next);
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        role="switch"
        aria-checked={value}
        aria-label={`Toggle ${flagKey}`}
        className={
          'relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-60 ' +
          (value ? 'bg-success-500' : 'bg-slate-300')
        }
      >
        <span
          className={
            'inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition ' +
            (value ? 'translate-x-6' : 'translate-x-1')
          }
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin text-slate-400" />
          ) : value ? (
            <Check size={11} className="text-success-700" />
          ) : (
            <X size={11} className="text-slate-400" />
          )}
        </span>
      </button>
      {error ? (
        <span className="text-[10px] text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
