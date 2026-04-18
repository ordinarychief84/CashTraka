import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, backHref, action }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 border-b border-border pb-5">
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
        <h1 className="truncate text-2xl font-black tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
