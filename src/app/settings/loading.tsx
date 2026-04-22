export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-app py-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-6">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-slate-100" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
