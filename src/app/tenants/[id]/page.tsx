import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, MessageCircle, Building2, AlertTriangle, Clock } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { RenewLeaseDialog } from '@/components/RenewLeaseDialog';
import { formatNaira, formatDate } from '@/lib/format';
import { displayPhone, waLink } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const tenant = await prisma.tenant.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      property: true,
      rentPayments: {
        orderBy: { period: 'desc' },
      },
    },
  });

  if (!tenant) notFound();

  const totalPaid = tenant.rentPayments
    .filter((p) => p.status === 'PAID' || p.status === 'PARTIAL')
    .reduce((s, p) => s + p.amount, 0);

  const overdueCount = tenant.rentPayments.filter((p) => p.status === 'OVERDUE').length;

  // Build reminder message
  const month = new Date(currentPeriod + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
  const reminderMsg = `Hi ${tenant.name}, your rent of ${formatNaira(tenant.rentAmount)} for ${month} at ${tenant.property.name} is due. Kindly make payment. Thank you.`;
  const waUrl = waLink(tenant.phone, reminderMsg);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.property.name}${tenant.unitLabel ? ' · ' + tenant.unitLabel : ''}`}
        backHref={`/properties/${tenant.propertyId}`}
        action={
          <div className="flex items-center gap-2">
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-wa">
              <MessageCircle size={16} />
              Send reminder
            </a>
            <Link href={`/tenants/${tenant.id}/edit`} className="btn-secondary">
              <Pencil size={16} />
            </Link>
          </div>
        }
      />

      {/* Profile info */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Phone: </span>
            <span className="font-medium text-ink">{displayPhone(tenant.phone)}</span>
          </div>
          <div>
            <span className="text-slate-500">Rent: </span>
            <span className="num font-medium text-ink">{formatNaira(tenant.rentAmount)}/{tenant.rentFrequency}</span>
          </div>
          <div>
            <span className="text-slate-500">Due day: </span>
            <span className="font-medium text-ink">{tenant.rentDueDay}th of each month</span>
          </div>
          {tenant.leaseStart && (
            <div>
              <span className="text-slate-500">Lease: </span>
              <span className="font-medium text-ink">
                {formatDate(tenant.leaseStart)}
                {tenant.leaseEnd ? ` - ${formatDate(tenant.leaseEnd)}` : ' onwards'}
              </span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Property: </span>
            <Link href={`/properties/${tenant.propertyId}`} className="font-medium text-brand-600 hover:underline">
              {tenant.property.name}
            </Link>
          </div>
        </div>
      </div>

      {/* Lease status banner */}
      {(() => {
        if (!tenant.leaseEnd) return null;
        const days = Math.round((tenant.leaseEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days > 30) return null;
        const expired = days <= 0;
        return (
          <div className={cn(
            'mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium',
            expired ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800',
          )}>
            {expired ? <AlertTriangle size={18} className="shrink-0" /> : <Clock size={18} className="shrink-0" />}
            <span className="flex-1">
              {expired
                ? `Lease expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago on ${formatDate(tenant.leaseEnd)}. Contact tenant or renew the lease.`
                : `Lease expires in ${days} day${days !== 1 ? 's' : ''} on ${formatDate(tenant.leaseEnd)}.`}
            </span>
            <RenewLeaseDialog
              tenantId={tenant.id}
              tenantName={tenant.name}
              currentLeaseEnd={tenant.leaseEnd.toISOString()}
            />
          </div>
        );
      })()}

      {/* Stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total paid" value={formatNaira(totalPaid)} tone="brand" />
        <StatCard label="Payments recorded" value={String(tenant.rentPayments.length)} />
        <StatCard
          label="Months overdue"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Rent history */}
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Rent history</h2>

      {tenant.rentPayments.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Building2 size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No payments yet</h3>
          <p className="mt-1 text-sm text-slate-600">Rent payments will appear here once recorded.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenant.rentPayments.map((p) => {
            const periodLabel = new Date(p.period + '-01').toLocaleDateString('en-NG', {
              month: 'long',
              year: 'numeric',
            });

            return (
              <div key={p.id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-ink">{periodLabel}</div>
                  {p.note && <div className="mt-0.5 text-xs text-slate-500">{p.note}</div>}
                  {p.paidAt && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      Paid {formatDate(p.paidAt)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      'num font-semibold',
                      p.status === 'PAID' && 'text-success-700',
                      p.status === 'PARTIAL' && 'text-slate-700',
                      p.status === 'PENDING' && 'text-slate-500',
                      p.status === 'OVERDUE' && 'text-owed-600',
                    )}
                  >
                    {formatNaira(p.amount)}
                  </div>
                  <span
                    className={cn(
                      p.status === 'PAID' && 'badge-paid',
                      p.status === 'PARTIAL' && 'badge-pending',
                      p.status === 'PENDING' && 'badge-pending',
                      p.status === 'OVERDUE' && 'badge-open',
                    )}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
