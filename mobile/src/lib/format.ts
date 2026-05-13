/**
 * Display formatters — kept in sync with `src/lib/format.ts` on the
 * web side so the same value renders identically on web and mobile.
 *
 * Money is stored as Int kobo everywhere in the system; UI shows naira.
 * Never multiply by 100 anywhere else — go through these helpers.
 */

export function formatKobo(amountKobo: number | bigint): string {
  if (typeof amountKobo === 'bigint') amountKobo = Number(amountKobo);
  if (!Number.isFinite(amountKobo as number)) return '₦0';
  const kobo = amountKobo as number;
  const naira = Math.abs(kobo) / 100;
  const hasFraction = Math.round((naira % 1) * 100) > 0;
  const formatted = naira.toLocaleString('en-NG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return kobo < 0 ? `-₦${formatted}` : `₦${formatted}`;
}

export function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '₦0';
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function formatDate(d: Date | string | number): string {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: Date | string | number): string {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(d: Date | string | number): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
