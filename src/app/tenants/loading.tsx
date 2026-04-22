export default function TenantsLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="container-app py-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
