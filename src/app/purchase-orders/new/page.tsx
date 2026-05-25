import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchaseOrderForm } from '@/components/ops/PurchaseOrderForm';
import { suppliersService } from '@/lib/services/suppliers.service';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';

export const dynamic = 'force-dynamic';

type SP = { supplierId?: string; materialId?: string; qty?: string };

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: SP }) {
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
      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        materials={materials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          unitCostKobo: m.unitCostKobo,
          supplierName: m.supplier?.name ?? null,
        }))}
        initialSupplierId={searchParams.supplierId}
        initialMaterialId={searchParams.materialId}
        initialMaterialQty={searchParams.qty ? Number(searchParams.qty) : undefined}
      />
    </AppShell>
  );
}
