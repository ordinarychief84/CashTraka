/**
 * Compact section heading used to chunk the dashboard into visual
 * sections so the page doesn't read as a flat list of equal-priority
 * cards. Sits above each row group on the seller dashboard.
 */
export function DashboardSectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 mt-1 flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2">
      <div className="min-w-0">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700 md:text-[13px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
