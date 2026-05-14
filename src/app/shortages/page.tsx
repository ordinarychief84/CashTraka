import { AlertTriangle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ShortageAlertList } from '@/components/ops/ShortageAlertList';
import { shortageService } from '@/lib/services/shortage.service';

export const dynamic = 'force-dynamic';

/**
 * Persisted shortage alerts feed (Bundle B).
 *
 * Mirrors what the dashboard "Shortage alerts" KPI surfaces. Operators
 * land here when they want to clear the backlog: each row carries the
 * production run it blocks, the deficit qty, and quick actions to buy
 * the material, mark the shortage resolved, or ignore it.
 */
export default async function ShortagesPage() {
  const user = await guard();
  const alerts = await shortageService.listOpenForUser(user.id, { limit: 200 });

  const rows = alerts.map((a) => ({
    id: a.id,
    materialId: a.materialId,
    materialName: a.material.name,
    unit: a.material.unit,
    requiredQuantity: a.requiredQuantity,
    availableQuantity: a.availableQuantity,
    shortageQuantity: a.shortageQuantity,
    severity: a.severity,
    recommendedAction: a.recommendedAction,
    neededByDate: a.neededByDate ? a.neededByDate.toISOString() : null,
    productionNumber: a.productionOrder.productionNumber,
    productionStatus: a.productionOrder.status,
    productionOrderId: a.productionOrderId,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Material shortage alerts"
        subtitle={
          rows.length === 0
            ? 'Every active run has materials.'
            : `${rows.length} open ${rows.length === 1 ? 'alert' : 'alerts'}`
        }
      />

      {rows.length === 0 ? (
        <div className="card flex items-center gap-3 p-6">
          <AlertTriangle size={20} className="text-emerald-600" />
          <div>
            <div className="text-sm font-semibold text-emerald-700">
              All clear
            </div>
            <p className="text-xs text-slate-500">
              No persisted shortage alerts. Alerts are recomputed when
              production orders are created or started.
            </p>
          </div>
        </div>
      ) : (
        <ShortageAlertList rows={rows} />
      )}
    </AppShell>
  );
}
