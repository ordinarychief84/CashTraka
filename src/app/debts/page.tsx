import Link from 'next/link';
import { Plus, Search, Clock3, AlertTriangle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { DebtActions } from '@/components/DebtActions';
import { formatNaira, formatDate } from '@/lib/format';
import { displayPhone } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type DebtFilter = 'all' | 'open' | 'overdue' | 'paid';
type SP = { q?: string; filter?: DebtFilter };

function parseFilter(v: string | undefined): DebtFilter {
  if (v === 'overdue' || v === 'open' || v === 'paid' || v === 'all') return v;
  return 'all';
}

export default async function DebtsPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const q = (searchParams.q || '').trim();
  const filter = parseFilter(searchParams.filter);
  const now = new Date();

  const where = {
    userId: user.id,
    ...(filter === 'open' ? { status: 'OPEN' } : {}),
    ...(filter === 'paid' ? { status: 'PAID' } : {}),
    ...(filter === 'overdue' ? { status: 'OPEN', dueDate: { lt: now, not: null } } : {}),
    ...(q ? { OR: [ { customerNameSnapshot: { contains: q } }, { phoneSnapshot: { contains: q.replace(/\D/g, '') } } ] } : {}),
  };

  const [debts, openAgg, overdueAgg] = await Promise.all([
    prisma.debt.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 }),
    prisma.debt.aggregate({ where: { userId: user.id, status: 'OPEN' }, _sum: { amountOwed: true, amountPaid: true } }),
    prisma.debt.aggregate({ where: { userId: user.id, status: 'OPEN', dueDate: { lt: now, not: null } }, _sum: { amountOwed: true, amountPaid: true }, _count: true }),
  ]);

  const totalOwed = Math.max((openAgg._sum.amountOwed ?? 0) - (openAgg._sum.amountPaid ?? 0), 0);
  const overdueTotal = Math.max((overdueAgg._sum.amountOwed ?? 0) - (overdueAgg._sum.amountPaid ?? 0), 0);
  const overdueCount = overdueAgg._count;

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Debts" subtitle="People who owe you money." action={<Link href="/debts/new" className="btn-primary"><Plus size={18} />Add</Link>} />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="card p-5"><div className="text-xs font-medium text-slate-500">Money owed to you</div><div className="num mt-1 text-3xl text-owed-600">{formatNaira(totalOwed)}</div></div>
        {overdueCount > 0 && (<Link href="/debts?filter=overdue" className="card flex items-center gap-3 p-5 hover:border-owed-500"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-owed-500 text-white"><AlertTriangle size={20} /></span><div className="min-w-0 flex-1"><div className="text-xs font-medium text-slate-500">Overdue</div><div className="text-sm"><span className="font-bold text-ink">{overdueCount} {overdueCount === 1 ? 'debt' : 'debts'}</span> · <span className="num text-owed-600">{formatNaira(overdueTotal)}</span></div></div></Link>)}
      </div>
      <form className="mb-4" action="/debts" method="get"><input type="hidden" name="filter" value={filter} /><div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search by name or phone" className="input \!pl-11" /></div></form>
      <div className="mb-4 flex flex-wrap gap-2"><FilterLink current={filter} value="all" label="All" q={q} /><FilterLink current={filter} value="open" label="Open" q={q} /><FilterLink current={filter} value="overdue" label="Overdue" q={q} tone="owed" /><FilterLink current={filter} value="paid" label="Paid" q={q} /></div>
      {debts.length === 0 ? (<EmptyState icon={Clock3} title={q || filter \!== 'all' ? 'No debts match your search' : 'No debts yet'} description={q || filter \!== 'all' ? 'Try a different name, phone or filter.' : 'Log who owes you, and send a reminder with one tap.'} actionHref="/debts/new" actionLabel="Add Debt" />) : (<ul className="space-y-2">{debts.map((d) => { const remaining = Math.max(d.amountOwed - d.amountPaid, 0); const isOverdue = d.status === 'OPEN' && d.dueDate && new Date(d.dueDate) < now; return (<li key={d.id} className="card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold text-ink">{d.customerNameSnapshot}</div><div className="mt-0.5 text-xs text-slate-500">{displayPhone(d.phoneSnapshot)}{d.dueDate ? (<>{' · '}<span className={isOverdue ? 'font-semibold text-owed-700' : ''}>{isOverdue ? 'Overdue ' : 'Due '}{formatDate(d.dueDate)}</span></>) : null}</div>{d.amountPaid > 0 && d.status === 'OPEN' && (<div className="mt-1 text-xs text-slate-600"><span className="num text-success-700">{formatNaira(d.amountPaid)}</span> paid{' · '}<span className="num text-owed-600">{formatNaira(remaining)}</span> remaining</div>)}</div><div className="text-right"><div className={d.status === 'OPEN' ? 'num text-owed-600' : 'num text-slate-500 line-through'}>{formatNaira(d.amountOwed)}</div><span className={d.status === 'OPEN' ? 'badge-open' : 'badge-paid'}>{d.status === 'OPEN' ? 'Open' : 'Paid'}</span></div></div><div className="mt-3"><DebtActions id={d.id} name={d.customerNameSnapshot} phone={d.phoneSnapshot} amountOwed={d.amountOwed} amountPaid={d.amountPaid} status={d.status as 'OPEN' | 'PAID'} /></div></li>); })}</ul>)}
    </AppShell>
  );
}

function FilterLink({ current, value, label, q, tone }: { current: DebtFilter; value: DebtFilter; label: string; q?: string; tone?: 'owed'; }) {
  const active = current === value;
  const qs = new URLSearchParams();
  qs.set('filter', value);
  if (q) qs.set('q', q);
  return (<Link href={`/debts?${qs.toString()}`} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', active && tone === 'owed' && 'border-owed-500 bg-owed-500 text-white', active && tone \!== 'owed' && 'border-brand-500 bg-brand-500 text-white', \!active && 'border-border bg-white text-slate-700 hover:bg-slate-50')}>{label}</Link>);
}
