import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Users, MessageCircle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatNaira, timeAgo } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

type SP = { q?: string };

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  // Property managers don't have customers — send them to tenants.
  if (user.businessType === 'property_manager') {
    const qs = searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : '';
    redirect(`/tenants${qs}`);
  }
  const q = (searchParams.q || '').trim();

  const customers = await prisma.customer.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q.replace(/\D/g, '') } },
            ],
          }
        : {}),
    },
    orderBy: { lastActivityAt: 'desc' },
    take: 200,
  });

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader
        title="Customers"
        subtitle="Automatically saved when you add a payment or debt."
      />

      <form className="mb-4" action="/customers" method="get">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search customers"
            className="input pl-10"
          />
        </div>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? 'No customers match your search' : 'No customers yet'}
          description={
            q
              ? 'Try a different name or phone.'
              : 'Customers will appear automatically when you add payments or debts.'
          }
          actionHref={q ? undefined : '/payments/new'}
          actionLabel={q ? undefined : 'Add your first payment'}
        />
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900">{c.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {displayPhone(c.phone)} · active {timeAgo(c.lastActivityAt)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="badge-paid">Paid {formatNaira(c.totalPaid)}</span>
                    {c.totalOwed > 0 && (
                      <span className="badge-open">Owes {formatNaira(c.totalOwed)}</span>
                    )}
                    <span className="badge bg-slate-100 text-slate-600">
                      {c.transactionCount} {c.transactionCount === 1 ? 'txn' : 'txns'}
                    </span>
                  </div>
                </Link>
                <Link
                  href={`/follow-up?customerId=${c.id}`}
                  className="btn-wa shrink-0 px-3 py-2 text-xs"
                  aria-label={`Follow up with ${c.name}`}
                >
                  <MessageCircle size={14} />
                  Follow up
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
