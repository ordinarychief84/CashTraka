'use client';

import { useRouter } from 'next/navigation';
import { StatusFilterSelect, type StatusFilterOption } from './StatusFilterSelect';

/**
 * Navigation-based status filter dropdown. Wraps `StatusFilterSelect` so
 * server pages can drive list filters through the URL (?status=…) instead
 * of client state.
 *
 * The empty-string option drops the `status` param entirely.
 */
export function StatusFilterNavSelect({
  current,
  options,
  baseHref,
  paramName = 'status',
  extraParams,
  label = 'Status',
  size = 'md',
}: {
  current: string;
  options: StatusFilterOption[];
  /** Path the page lives at, e.g. "/production". */
  baseHref: string;
  paramName?: string;
  /** Other query params to preserve (e.g. {view: 'list'}). */
  extraParams?: Record<string, string>;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();

  function navigate(next: string) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams ?? {})) {
      if (v) sp.set(k, v);
    }
    if (next) sp.set(paramName, next);
    const qs = sp.toString();
    router.push(qs ? `${baseHref}?${qs}` : baseHref);
  }

  return (
    <StatusFilterSelect
      value={current}
      onChange={navigate}
      options={options}
      label={label}
      size={size}
    />
  );
}
