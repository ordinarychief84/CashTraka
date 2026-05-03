import { Heart } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const RATING_LABELS: Record<string, { label: string; cls: string }> = {
  VERY_HAPPY: { label: 'Very happy', cls: 'bg-success-100 text-success-800' },
  HAPPY: { label: 'Happy', cls: 'bg-brand-50 text-brand-700' },
  UNHAPPY: { label: 'Unhappy', cls: 'bg-amber-50 text-amber-700' },
  VERY_UNHAPPY: { label: 'Very unhappy', cls: 'bg-red-50 text-red-700' },
};

const REASON_LABELS: Record<string, string> = {
  DELAY: 'Delay',
  WRONG_ITEM: 'Wrong item',
  POOR_SERVICE: 'Poor service',
  PAYMENT_ISSUE: 'Payment issue',
  OTHER: 'Other',
};

export default async function AdminFeedbackPage() {
  const admin = await requireAdminSection('feedback');

  const baseWhere = { submittedAt: { not: null } } as const;
  const [total, negative, totalLinks, recentNegative] = await Promise.all([
    prisma.feedback.count({ where: baseWhere }),
    prisma.feedback.count({ where: { ...baseWhere, isNegative: true } }),
    prisma.feedback.count({}),
    prisma.feedback.findMany({
      where: { ...baseWhere, isNegative: true },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, businessName: true, email: true },
        },
        customer: { select: { id: true, name: true } },
      },
    }),
  ]);

  const responseRate =
    totalLinks > 0 ? Math.round((total / totalLinks) * 100) : 0;

  return (
    <AdminShell
      adminName={admin.name}
      activePath="/admin/feedback"
      adminRole={admin.adminRole}
    >
      <div className="mb-6 flex items-center gap-2">
        <Heart size={20} className="text-brand-600" />
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Service Check</h1>
          <p className="mt-1 text-sm text-slate-500">
            Platform-wide customer feedback collected by all tenants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Submitted" value={String(total)} />
        <Card label="Negative" value={String(negative)} />
        <Card label="Total links sent" value={String(totalLinks)} />
        <Card label="Response rate" value={`${responseRate}%`} />
      </div>

      <h2 className="mt-8 mb-2 text-sm font-bold text-ink">
        Recent negative feedback (top 20)
      </h2>
      {recentNegative.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-slate-600">
          No negative feedback yet across the platform.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white">
          {recentNegative.map((r) => {
            const pill =
              RATING_LABELS[r.rating] ?? {
                label: r.rating,
                cls: 'bg-slate-100 text-slate-700',
              };
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      {r.user.businessName || r.user.name}
                    </span>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                        pill.cls
                      }
                    >
                      {pill.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {r.customer?.name ?? 'Customer'}
                    {' · '}
                    {r.submittedAt ? formatDateTime(r.submittedAt) : ''}
                    {r.reason
                      ? ' · ' + (REASON_LABELS[r.reason] ?? r.reason)
                      : ''}
                  </div>
                  {r.comment ? (
                    <div className="mt-1 text-sm text-slate-700">
                      &ldquo;{r.comment}&rdquo;
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-xs text-slate-500">
                  {r.user.email}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black leading-none tracking-tight text-ink">
        {value}
      </div>
    </div>
  );
}
