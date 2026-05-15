import { Repeat } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NewTemplateForm } from '@/components/production-templates/NewTemplateForm';
import { TemplateRowActions } from '@/components/production-templates/TemplateRowActions';
import { productionTemplatesService } from '@/lib/services/production-templates.service';

export const dynamic = 'force-dynamic';

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
};

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scheduleLabel(t: {
  cadence: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourOfDay: number;
}): string {
  const cadence = CADENCE_LABEL[t.cadence] ?? t.cadence;
  const hour = `${t.hourOfDay.toString().padStart(2, '0')}:00`;
  if (t.cadence === 'monthly') {
    return `${cadence} on day ${t.dayOfMonth ?? 1} at ${hour}`;
  }
  const day = DAY_LABEL[t.dayOfWeek ?? 1];
  return `${cadence} on ${day} at ${hour}`;
}

export default async function ProductionTemplatesPage() {
  const user = await guard();

  const [templates, products] = await Promise.all([
    productionTemplatesService.listForUser(user.id),
    prisma.product.findMany({
      where: { userId: user.id, archived: false, canBeProduced: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // If the user has no canBeProduced products yet, surface every non-archived
  // product as a fallback so brand-new accounts can still create a template
  // before they think to flip the canBeProduced switch.
  const productOptions =
    products.length > 0
      ? products
      : await prisma.product.findMany({
          where: { userId: user.id, archived: false },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
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
        title="Production templates"
        subtitle="Recurring rules that spawn a production order automatically — every Monday, the 1st of the month, etc."
        backHref="/production"
      />

      <div className="mb-6">
        <NewTemplateForm products={productOptions} />
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring templates yet"
          description="Create one above to skip the daily 'what do I make today' question. The cron spawns a production order each Monday (or whichever cadence you pick)."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50/50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Template</th>
                <th className="px-3 py-2.5">Schedule</th>
                <th className="px-3 py-2.5">Items</th>
                <th className="px-3 py-2.5">Next run</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <div className="text-sm font-semibold text-ink">{t.title}</div>
                    {t.notes && (
                      <div className="line-clamp-1 text-[10px] text-slate-500">{t.notes}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {scheduleLabel(t)}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {t.items.length === 0
                      ? '—'
                      : t.items
                          .map(
                            (it) =>
                              `${it.quantity} × ${it.product?.name ?? 'Product'}`,
                          )
                          .join(', ')}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmtDate(t.nextRunAt)}
                    {t.lastRunAt && (
                      <div className="text-[10px] text-slate-400">
                        Last spawned {fmtDate(t.lastRunAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right">
                    <TemplateRowActions templateId={t.id} status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
