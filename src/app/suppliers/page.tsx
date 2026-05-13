import Link from 'next/link';
import { Plus, Search, Truck } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { suppliersService } from '@/lib/services/suppliers.service';

export const dynamic = 'force-dynamic';

type SP = { q?: string };

export default async function SuppliersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const { rows: suppliers, total } = await suppliersService.listForUser(user.id, {
    q,
    take: 200,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Suppliers"
        subtitle={`${total} supplier${total === 1 ? '' : 's'}`}
        action={
          <Link href="/suppliers/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            New supplier
          </Link>
        }
      />

      <form className="mb-4" action="/suppliers" method="get">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search suppliers"
            className="input !pl-11"
          />
        </div>
      </form>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={q ? 'No suppliers match your search' : 'No suppliers yet'}
          description={
            q
              ? 'Try a different name.'
              : 'Add the businesses you buy raw materials from. We use this to route purchase orders.'
          }
          actionHref={q ? undefined : '/suppliers/new'}
          actionLabel={q ? undefined : 'Add your first supplier'}
        />
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link href={`/suppliers/${s.id}`} className="card flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {[s.contactPerson, s.phone, s.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
