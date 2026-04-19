'use client';

import { RefreshCw } from 'lucide-react';

/** Tiny client-only button so the /offline page can trigger a reload. */
export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="btn-primary mt-6 inline-flex"
    >
      <RefreshCw size={16} />
      Try again
    </button>
  );
}
