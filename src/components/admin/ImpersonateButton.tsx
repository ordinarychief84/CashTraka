'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';

export function ImpersonateButton({
  userId,
  userEmail,
  disabled,
  disabledReason,
}: {
  userId: string;
  userEmail: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (disabled) return;
    const ok = window.confirm(
      `Impersonate ${userEmail}?\n\nYou will see what they see for 1 hour. Every action you take is attributed to you in the audit log.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
          method: 'POST',
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || body.success === false) {
          setError(body.error || 'Failed to start impersonation');
          return;
        }
        router.replace('/dashboard');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        title={disabled ? disabledReason : 'Sign in as this user (1h, fully audited)'}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserCheck size={13} />
        {isPending ? 'Starting…' : 'Impersonate'}
      </button>
      {error ? (
        <span className="text-[10px] text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
