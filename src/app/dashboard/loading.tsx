export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-app py-6">
        {/* Header skeleton */}
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-5 w-64 animate-pulse rounded bg-slate-100" />

        {/* Stat cards skeleton */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Action items skeleton */}
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
