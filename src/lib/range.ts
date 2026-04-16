export type RangeKey = 'today' | 'week' | 'month' | 'all';

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  all: 'All time',
};

export function parseRange(value: string | undefined | null): RangeKey {
  if (value === 'today' || value === 'week' || value === 'month' || value === 'all') {
    return value;
  }
  return 'month';
}

/** Returns the inclusive `createdAt >= start` cut-off for a range, or null for "all time". */
export function rangeStart(key: RangeKey): Date | null {
  if (key === 'all') return null;
  const now = new Date();
  if (key === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (key === 'week') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    // Monday as start of week (Nigerian business default).
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
