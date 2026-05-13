'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to Sentry first, then log for local dev.
    // `digest` is Next.js's server-side error id — attaching it as a
    // tag lets us pivot from a user report ("I got error abc123") to
    // the exact Sentry issue.
    Sentry.captureException(error, {
      tags: { digest: error.digest, source: 'app/error.tsx' },
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unhandled error:', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black text-red-600">Oops!</h1>
        <p className="mt-3 text-lg font-semibold text-ink">Something went wrong</p>
        <p className="mt-1 text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
