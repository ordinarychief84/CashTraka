import Link from 'next/link';
import { Users, MessageCircle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira } from '@/lib/format';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TenantsPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await guard();
  const filter = searchParams.status || 'active';

  const tenants = await prisma.tenant.findMany({
    where: {
      userId: user.id,
      ...(filter !== 'all' ? { status: filter } : {}),
    },
    include: { property: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Tenants"
        subtitle="All tenants across your properties."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterPill current={filter} value="active" label="Active" />
        <FilterPill current={filter} value="all" label="All" />
        <FilterPill current={filter} value="moved_out" label="Moved out" />
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add tenants from a property's detail page."
          actionHref="/properties"
          actionLabel="View properties"
        />
      ) : (
        <ul className="space-y-2">
          {tenants.map((t) => (
            <li key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/tenants/${t.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{t.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.property.name}
                    {t.unitLabel ? ` · Unit ${t.unitLabel}` : ''}
                    {' · '}{displayPhone(t.phone)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="num rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                      {formatNaira(t.rentAmount)}/{t.rentFrequency === 'monthly' ? 'mo' : t.rentFrequency}
                    </span>
                    <span
                      className={cn(
                        'badge',
                        t.status === 'active' ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {t.status}
                    </span>
                  </div>
                </Link>
                {t.status === 'active' && (
                  <a
                    href={waLink(t.phone, `Hi ${t.name}, this is a reminder about your rent at ${t.property.name}. Kindly make payment. Thank you.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-wa shrink-0 px-3 py-2 text-xs"
                  >
                    <MessageCircle size={14} />
                    Remind
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function FilterPill({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value;
  return (
    <Link
      href={`/tenants?status=${value}`}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active ? 'border-brand-500 bg-brand-500 text-white' : 'border-border bg-white text-slate-700',
      )}
    >
      {label}
    </Link>
  );
}
