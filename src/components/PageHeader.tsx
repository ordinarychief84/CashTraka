import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
};

/**
 * Shared page header used by older dashboard surfaces (forms, settings,
 * detail pages). Newer list dashboards (Orders, Production, Inventory,
 * etc.) inline an equivalent layout to compose multiple action pills.
 *
 * Typography mirrors the `.page-title` / `.page-subtitle` utilities in
 * globals.css so the visual feel is uniform regardless of which entry
 * point you came through.
 */
export function PageHeader({ title, subtitle, backHref, action }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        )}
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
