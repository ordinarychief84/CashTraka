import Link from 'next/link';
import { Plus, Building2, MapPin, Users } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatCard } from '@/components/StatCard';
import { formatNaira } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const user = await guard();
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      tenants: {
        where: { status: 'active' },
        include: {
          rentPayments: {
            where: { period: currentPeriod },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Compute totals
  let totalExpected = 0;
  let totalCollected = 0;
  let totalTenants = 0;

  for (const p of properties) {
    for (const t of p.tenants) {
      totalTenants++;
      totalExpected += t.rentAmount;
      const payment = t.rentPayments[0];
      if (payment && (payment.status === 'PAID' || payment.status === 'PARTIAL')) {
        totalCollected += payment.amount;
      }
    }
  }

  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Properties"
        subtitle="Manage your rental properties."
        action={
          <Link href="/properties/new" className="btn-primary">
            <Plus size={18} />
            Add property
          </Link>
        }
      />

      {properties.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Properties" value={String(properties.length)} />
          <StatCard label="Active tenants" value={String(totalTenants)} />
          <StatCard label="Expected this month" value={formatNaira(totalExpected)} tone="brand" />
          <StatCard
            label="Collection rate"
            value={`${collectionRate}%`}
            tone={collectionRate >= 80 ? 'brand' : 'danger'}
            sub={`${formatNaira(totalCollected)} collected`}
          />
        </div>
      )}

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start managing tenants and rent."
          actionHref="/properties/new"
          actionLabel="Add property"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const tenantCount = p.tenants.length;
            const propExpected = p.tenants.reduce((s, t) => s + t.rentAmount, 0);
            const propCollected = p.tenants.reduce((s, t) => {
              const pay = t.rentPayments[0];
              return s + (pay && (pay.status === 'PAID' || pay.status === 'PARTIAL') ? pay.amount : 0);
            }, 0);
            const propRate = propExpected > 0 ? Math.round((propCollected / propExpected) * 100) : 0;

            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="card block p-5 transition hover:border-brand-300"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{p.name}</div>
                    {p.address && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} />
                        <span className="truncate">{p.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    {tenantCount} {tenantCount === 1 ? 'tenant' : 'tenants'}
                  </span>
                  {p.unitCount > 0 && <span>{p.unitCount} units</span>}
                </div>
                {tenantCount > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Expected: <span className="num font-medium text-ink">{formatNaira(propExpected)}</span>
                    </span>
                    <span className={propRate >= 80 ? 'font-semibold text-success-700' : 'font-semibold text-owed-600'}>
                      {propRate}% collected
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
