import { cn } from '@/lib/utils';

/**
 * Single source of truth for status pills across CashTraka.
 *
 * The palette stays inside the brand tokens already defined in
 * tailwind.config.ts (brand-cyan, success-lime, owed-amber, slate,
 * emerald, rose). Each status name maps to one tone — change it here
 * once and every list / detail page picks up the new colour.
 *
 * If a caller passes a status not in the registry it falls back to the
 * neutral slate pill so nothing crashes on a typo or a future enum
 * value.
 */

type Tone =
  | 'slate'
  | 'brand'
  | 'success'
  | 'owed'
  | 'rose'
  | 'emerald'
  | 'ink';

const TONE_CLS: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-success-100 text-success-800',
  owed: 'bg-owed-100 text-owed-800',
  rose: 'bg-rose-100 text-rose-700',
  emerald: 'bg-emerald-100 text-emerald-800',
  ink: 'bg-ink text-white',
};

/**
 * Canonical status → tone map. Keep additive. Lower-case keys avoid
 * case-mismatch landmines when statuses come from different services.
 */
const STATUS_TONE: Record<string, Tone> = {
  // Customer order
  new: 'slate',
  confirmed: 'brand',
  in_production: 'owed',
  ready: 'success',
  delivered: 'emerald',
  cancelled: 'rose',

  // Production order (overlaps NEW with PLANNED etc.)
  planned: 'slate',
  materials_needed: 'owed',
  ready_to_produce: 'brand',
  completed: 'success',
  delayed: 'rose',

  // Purchase order
  draft: 'slate',
  sent: 'brand',
  ordered: 'owed',
  partially_received: 'brand',
  received: 'success',

  // Payment / invoice
  unpaid: 'slate',
  part_paid: 'owed',
  partially_paid: 'owed',
  paid: 'success',
  overdue: 'rose',
  viewed: 'brand',

  // Shortage severity
  low: 'slate',
  medium: 'owed',
  high: 'owed',
  critical: 'rose',

  // Supplier
  active: 'success',
  inactive: 'slate',
  blacklisted: 'rose',

  // Recipe
  archived: 'slate',

  // Generic
  open: 'owed',
  resolved: 'success',
  ignored: 'slate',
};

/** Lookup a Tone for a status string, defaulting to slate. */
export function toneForStatus(status: string | null | undefined): Tone {
  if (!status) return 'slate';
  return STATUS_TONE[status.toLowerCase()] ?? 'slate';
}

/**
 * Render the canonical badge. By default capitalises + replaces
 * underscores so "MATERIALS_NEEDED" reads as "Materials needed".
 */
export function StatusBadge({
  status,
  size = 'sm',
  className,
  uppercase = true,
}: {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  uppercase?: boolean;
}) {
  const tone = toneForStatus(status);
  const label = formatStatus(status, uppercase);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        uppercase && 'uppercase',
        TONE_CLS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

function formatStatus(s: string, uppercase: boolean): string {
  const cleaned = s.replace(/_/g, ' ');
  if (uppercase) return cleaned;
  // Sentence case: First word capitalised, rest lower.
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
