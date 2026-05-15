import Link from 'next/link';
import { Plus, Download, BarChart3 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ServiceCheckHeroKpis } from '@/components/service-check/ServiceCheckHeroKpis';
import { ServiceCheckChartRow } from '@/components/service-check/ServiceCheckChartRow';
import {
  ServiceCheckTable,
  type ServiceCheckRow,
} from '@/components/service-check/ServiceCheckTable';
import { ServiceCheckRightRail } from '@/components/service-check/ServiceCheckRightRail';

export const dynamic = 'force-dynamic';

const RATING_SCORE: Record<string, number> = {
  VERY_HAPPY: 5,
  HAPPY: 4,
  UNHAPPY: 2,
  VERY_UNHAPPY: 1,
};

function deriveStatus(f: {
  submittedAt: Date | null;
  expiresAt: Date | null;
  isResolved: boolean;
  isNegative: boolean;
}): string {
  if (f.submittedAt && f.isNegative && f.isResolved) return 'RESOLVED';
  if (f.submittedAt) return 'COMPLETED';
  if (f.expiresAt && new Date(f.expiresAt).getTime() < Date.now()) return 'OVERDUE';
  return 'PENDING';
}

export default async function ServiceCheckPage() {
  const user = await guard();

  const feedbacks = await prisma.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      rating: true,
      source: true,
      submittedAt: true,
      createdAt: true,
      expiresAt: true,
      isResolved: true,
      isNegative: true,
      customer: { select: { name: true } },
      receipt: { select: { receiptNumber: true } },
      invoice: { select: { invoiceNumber: true } },
    },
  });

  const rows: ServiceCheckRow[] = feedbacks.map((f) => {
    const score = f.rating in RATING_SCORE ? RATING_SCORE[f.rating] : null;
    const relatedOrder =
      f.receipt?.receiptNumber ?? f.invoice?.invoiceNumber ?? null;
    return {
      id: f.id,
      checkId: `SC-${f.id.slice(-6).toUpperCase()}`,
      customerName: f.customer?.name ?? 'Customer',
      relatedOrder,
      feedbackType: f.source,
      dateSent: f.createdAt.toISOString(),
      dateResponded: f.submittedAt ? f.submittedAt.toISOString() : null,
      satisfactionScore: score,
      status: deriveStatus(f),
      assignedStaff: user.name ?? 'You',
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
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Service Check
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track customer feedback, satisfaction scores, and follow-up actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/reports" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </Link>
          <Link href="/reports" className="btn-pill-ghost">
            <BarChart3 size={14} />
            Reports
          </Link>
          <Link href="/service-check" className="btn-pill-primary">
            <Plus size={14} />
            New Service Check
          </Link>
        </div>
      </div>

      {/* 6 KPI tiles */}
      <ServiceCheckHeroKpis userId={user.id} />

      {/* 3 chart cards */}
      <ServiceCheckChartRow userId={user.id} />

      {/* 2-col: table (3/4) + right rail (1/4) */}
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ServiceCheckTable rows={rows} />
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <ServiceCheckRightRail userId={user.id} />
        </aside>
      </div>
    </AppShell>
  );
}
