export default function RentLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-app py-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
