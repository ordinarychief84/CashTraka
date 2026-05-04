// Naira currency + date helpers.

/**
 * Legacy naira formatter — accepts a NAIRA value and renders "₦12,500".
 *
 * During Phase 6 of the kobo migration, call sites are being switched to
 * read from the new `*Kobo` columns and render via `formatKobo`. New code
 * should use `formatKobo` directly. This wrapper stays during the migration
 * so any unmigrated call site continues to render correctly.
 */
export function formatNaira(amount: number | bigint): string {
  const n = typeof amount === 'bigint' ? Number(amount) : amount;
  return '₦' + n.toLocaleString('en-NG');
}

// Re-export the kobo-native formatter so call sites can `import { formatKobo }
// from '@/lib/format'` consistently with the rest of the helpers in this
// module. The implementation lives in `src/lib/money.ts`.
export { formatKobo } from './money';

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
