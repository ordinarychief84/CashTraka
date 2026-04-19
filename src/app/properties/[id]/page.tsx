import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, Building2, Pencil } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { TenantRowActions } from '@/components/TenantRowActions';
import { formatNaira } from '@/lib/format';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const property = await prisma.property.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      tenants: {
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        include: {
          rentPayments: {
            where: { period: currentPeriod },
            take: 1,
          },
        },
      },
    },
  });

  if (!property) notFound();

  function rentReminderMessage(tenantName: string, rentAmount: number, period: string, propertyName: string) {
    const month = new Date(period + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    return `Hi ${tenantName}, your rent of ${formatNaira(rentAmount)} for ${month} at ${propertyName} is due. Kindly make payment. Thank you.`;
  }

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title={property.name}
        subtitle={property.address || undefined}
        backHref="/properties"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/tenants/new?propertyId=${property.id}`} className="btn-primary">
              <Plus size={18} />
              Add tenant
            </Link>
            <Link href={`/properties/${property.id}/edit`} className="btn-secondary">
              <Pencil size={16} />
            </Link>
          </div>
        }
      />

      {/* Property info */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {property.unitCount > 0 && (
            <div>
              <span className="text-slate-500">Units: </span>
              <span className="font-medium text-ink">{property.unitCount}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Active tenants: </span>
            <span className="font-medium text-ink">{property.tenants.length}</span>
          </div>
          {property.note && (
            <div className="w-full text-slate-600">{property.note}</div>
          )}
        </div>
      </div>

      {/* Tenants list */}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Tenants</h2>

      {property.tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants yet"
          description="Add tenants to this property to start tracking rent."
          actionHref={`/tenants/new?propertyId=${property.id}`}
          actionLabel="Add tenant"
        />
      ) : (
        <ul className="space-y-2">
          {property.tenants.map((t) => {
            const payment = t.rentPayments[0];
            const status = payment?.status || 'PENDING';
            const msg = rentReminderMessage(t.name, t.rentAmount, currentPeriod, property.name);
            const waUrl = waLink(t.phone, msg);

            return (
              <li key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="truncate font-semibold text-ink hover:text-brand-600"
                    >
                      {t.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {t.unitLabel && <span>{t.unitLabel} · </span>}
                      {displayPhone(t.phone)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <span className="num font-medium text-ink">{formatNaira(t.rentAmount)}/mo</span>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                          status === 'PAID' && 'badge-paid',
                          status === 'PARTIAL' && 'badge-pending',
                          status === 'PENDING' && 'badge-pending',
                          status === 'OVERDUE' && 'badge-open',
                        )}
                      >
                        {status === 'PAID' && 'Paid'}
                        {status === 'PARTIAL' && 'Partial'}
                        {status === 'PENDING' && 'Pending'}
                        {status === 'OVERDUE' && 'Overdue'}
                      </span>
                    </div>
                  </div>
                  <TenantRowActions
                    tenantId={t.id}
                    tenantName={t.name}
                    phone={t.phone}
                    rentAmount={t.rentAmount}
                    propertyName={property.name}
                    period={currentPeriod}
                    waLink={waUrl}
                    editHref={`/tenants/${t.id}/edit`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
