import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { hasFeature } from '@/lib/gate';
import { AppShell } from '@/components/AppShell';
import { UpgradeChip } from '@/components/billing/UpgradeChip';
import { ProfitabilityClient } from './ProfitabilityClient';

export const dynamic = 'force-dynamic';

/**
 * /reports/profitability — historical batch cost report.
 *
 * Pro+ gated. Free users see the UpgradeChip ONLY — no data is fetched
 * for them, so the gate can't leak metrics via timing or response size.
 */
export default async function ProfitabilityPage(
  props: {
    searchParams: Promise<{ range?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await guard();

  if (!hasFeature(user, 'batchCostIntelligence')) {
    return (
      <AppShell
        businessName={user.businessName}
        userName={user.name}
        businessType={user.businessType}
        accessRole={user.accessRole}
        principalName={user.principalName}
      >
        <h1 className="page-title mb-2">Profitability</h1>
        <p className="page-subtitle mb-6">
          See material + labour + overhead cost and gross margin for every completed batch.
        </p>
        <UpgradeChip
          feature="batchCostIntelligence"
          suggestedPlanLabel="Pro"
          variant="block"
        />
      </AppShell>
    );
  }

  // Range filter: last N days. Default 90.
  const allowed = new Set([30, 60, 90]);
  const reqDays = Number(searchParams.range ?? 90);
  const days = allowed.has(reqDays) ? reqDays : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.productionOrder.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      status: 'COMPLETED',
      batchCostCalculatedAt: { not: null, gte: since },
    },
    select: {
      id: true,
      productionNumber: true,
      completedAt: true,
      quantityAccepted: true,
      quantityProduced: true,
      materialCostKobo: true,
      labourCostKobo: true,
      overheadCostKobo: true,
      totalCostKobo: true,
      revenueKobo: true,
      grossMarginBps: true,
      costPerUnitKobo: true,
      items: {
        select: {
          product: { select: { name: true } },
          quantity: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: 500,
  });

  // Shape for the client component — JSON-serialisable, kobo as plain Int.
  const data = rows.map((r) => ({
    id: r.id,
    productionNumber: r.productionNumber,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    productName: r.items[0]?.product?.name ?? '—',
    quantity:
      r.quantityAccepted ?? r.quantityProduced ?? r.items.reduce((s, it) => s + it.quantity, 0),
    materialCostKobo: r.materialCostKobo ?? 0,
    labourCostKobo: r.labourCostKobo ?? 0,
    overheadCostKobo: r.overheadCostKobo ?? 0,
    totalCostKobo: r.totalCostKobo ?? 0,
    revenueKobo: r.revenueKobo ?? 0,
    grossMarginBps: r.grossMarginBps ?? 0,
    costPerUnitKobo: r.costPerUnitKobo ?? 0,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Profitability</h1>
          <p className="page-subtitle">
            Material + labour + overhead cost and gross margin per completed batch.
          </p>
        </div>
      </div>
      <ProfitabilityClient initial={data} days={days} />
    </AppShell>
  );
}
