'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function EndImpersonationButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/impersonate`, {
          method: 'DELETE',
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || body.success === false) {
          setError(body.error || 'Failed to end impersonation');
          return;
        }
        router.replace('/admin/users');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-amber-700 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-800 disabled:opacity-60"
      >
        {isPending ? 'Ending…' : 'End impersonation'}
      </button>
    </div>
  );
}
