import { Repeat } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/format';
import { RecurringRuleRow } from './RecurringRuleRow';
import { NewRecurringRuleForm } from './NewRecurringRuleForm';

export const dynamic = 'force-dynamic';

type Template = {
  customerName?: string;
  customerPhone?: string;
};

function parseTemplate(raw: string | null): Template {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Template;
  } catch {
    return {};
  }
}

export default async function RecurringInvoicesPage() {
  const user = await guard();
  const rules = await prisma.recurringInvoiceRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const enriched = rules.map((r) => {
    const tpl = parseTemplate(r.templateData);
    return {
      id: r.id,
      frequency: r.frequency,
      customerName: tpl.customerName ?? '-',
      nextRunAt: r.nextRunAt ? formatDate(r.nextRunAt) : '-',
      status: r.status,
      runsCompleted: r.runsCompleted,
      autoSend: r.autoSend,
    };
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
        title="Recurring invoices"
        subtitle="Generate the same invoice on a schedule. Pause or cancel any time."
      />

      <div className="mb-6">
        <NewRecurringRuleForm />
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring rules yet"
          description="Set up a rule above to auto-generate the same invoice on a weekly or monthly cadence."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Frequency</th>
                <th className="px-3 py-2">Next run</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Runs</th>
                <th className="px-3 py-2">Auto-send</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map((r) => (
                <RecurringRuleRow key={r.id} rule={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
