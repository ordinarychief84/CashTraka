import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-border">
        <div className="text-4xl">🏪</div>
        <h1 className="mt-3 text-lg font-bold text-ink">Storefront not available</h1>
        <p className="mt-2 text-sm text-slate-600">
          This shop link doesn&apos;t exist or has been turned off. If you think this is a
          mistake, ask the seller for an updated link.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Visit CashTraka
        </Link>
      </div>
    </div>
  );
}
