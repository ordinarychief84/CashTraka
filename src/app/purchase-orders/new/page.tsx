import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PurchaseOrderForm } from '@/components/ops/PurchaseOrderForm';
import { suppliersService } from '@/lib/services/suppliers.service';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';

export const dynamic = 'force-dynamic';

type SP = { supplierId?: string; materialId?: string; qty?: string };

export default async function NewPurchaseOrderPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const user = await guard();
  const [{ rows: suppliers }, { rows: materials }] = await Promise.all([
    suppliersService.listForUser(user.id, { take: 500 }),
    rawMaterialsService.listForUser(user.id, { take: 1000 }),
  ]);
  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title="New purchase order" backHref="/purchase-orders" />
      <div className="card p-5">
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            unitCostKobo: m.unitCostKobo,
          }))}
          initialSupplierId={searchParams.supplierId}
          initialMaterialId={searchParams.materialId}
          initialMaterialQty={searchParams.qty ? Number(searchParams.qty) : undefined}
        />
      </div>
    </AppShell>
  );
}
