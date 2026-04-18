import Link from 'next/link';
import { Search, Wallet, Clock3, Users, Users2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira, timeAgo } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';
import { isPropertyManager } from '@/lib/business-type';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await guard();
  const isPm = isPropertyManager(user.businessType);
  const q = (searchParams.q || '').trim();

  if (!q) {
    return (
      <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
        <PageHeader
          title="Search"
          subtitle={
            isPm
              ? 'Find a tenant, rent payment, or unpaid rent.'
              : 'Find a customer, payment, or debt.'
          }
        />
        <EmptyState
          icon={Search}
          title="Type something to search"
          description={isPm ? 'Search by tenant name or phone number.' : 'Search by customer name or phone number.'}
        />
      </AppShell>
    );
  }

  const digits = q.replace(/\D/g, '');

  // Seller search: customers + payments + debts
  // PM search: tenants + rent payments + unpaid rent (scoped to their property world).
  const [customers, tenants, payments, debts] = await Promise.all([
    isPm
      ? Promise.resolve([] as any[])
      : prisma.customer.findMany({
          where: {
            userId: user.id,
            OR: [
              { name: { contains: q } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          },
          orderBy: { lastActivityAt: 'desc' },
          take: 20,
        }),
    isPm
      ? prisma.tenant.findMany({
          where: {
            userId: user.id,
            OR: [
              { name: { contains: q } },
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          },
          include: { property: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([] as any[]),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        OR: [
          { customerNameSnapshot: { contains: q } },
          ...(digits ? [{ phoneSnapshot: { contains: digits } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.debt.findMany({
      where: {
        userId: user.id,
        OR: [
          { customerNameSnapshot: { contains: q } },
          ...(digits ? [{ phoneSnapshot: { contains: digits } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const totalHits = customers.length + tenants.length + payments.length + debts.length;

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title={`Results for "${q}"`}
        subtitle={`${totalHits} ${totalHits === 1 ? 'result' : 'results'}`}
      />

      {totalHits === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matched"
          description="Try a different name or phone number."
        />
      ) : (
        <div className="space-y-6">
          {!isPm && customers.length > 0 && (
            <Section title="Customers" icon={<Users size={16} />}>
              <ul className="card divide-y divide-border">
                {customers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{c.name}</div>
                        <div className="text-xs text-slate-500">
                          {displayPhone(c.phone)} · active {timeAgo(c.lastActivityAt)}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="num text-success-700">Paid {formatNaira(c.totalPaid)}</div>
                        {c.totalOwed > 0 && (
                          <div className="num text-owed-600">Owes {formatNaira(c.totalOwed)}</div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {isPm && tenants.length > 0 && (
            <Section title="Tenants" icon={<Users2 size={16} />}>
              <ul className="card divide-y divide-border">
                {tenants.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tenants/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{t.name}</div>
                        <div className="text-xs text-slate-500">
                          {displayPhone(t.phone)}
                          {t.property?.name ? ` · ${t.property.name}` : ''}
                          {t.unitLabel ? ` · Unit ${t.unitLabel}` : ''}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="num text-ink">{formatNaira(t.rentAmount)}<span className="text-slate-500">/mo</span></div>
                        <div className="text-[10px] font-semibold text-slate-500">{t.status}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {payments.length > 0 && (
            <Section title={isPm ? 'Rent payments' : 'Payments'} icon={<Wallet size={16} />}>
              <ul className="card divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{p.customerNameSnapshot}</div>
                      <div className="text-xs text-slate-500">
                        {displayPhone(p.phoneSnapshot)} · {timeAgo(p.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={p.status === 'PAID' ? 'num text-success-700' : 'num text-ink'}>
                        {formatNaira(p.amount)}
                      </div>
                      <span className={p.status === 'PAID' ? 'badge-paid' : 'badge-pending'}>
                        {p.status === 'PAID' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {debts.length > 0 && (
            <Section title={isPm ? 'Unpaid rent' : 'Debts'} icon={<Clock3 size={16} />}>
              <ul className="card divide-y divide-border">
                {debts.map((d) => {
                  const remaining = Math.max(d.amountOwed - d.amountPaid, 0);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{d.customerNameSnapshot}</div>
                        <div className="text-xs text-slate-500">
                          {displayPhone(d.phoneSnapshot)} · {timeAgo(d.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={d.status === 'OPEN' ? 'num text-owed-600' : 'num text-slate-500 line-through'}>
                          {formatNaira(remaining || d.amountOwed)}
                        </div>
                        <span className={d.status === 'OPEN' ? 'badge-open' : 'badge-paid'}>
                          {d.status === 'OPEN' ? 'Open' : 'Paid'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="text-brand-600">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
