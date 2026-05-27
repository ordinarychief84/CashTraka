import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { inventoryService } from '@/lib/services/inventory.service';
import { ReceiptsTable, type ReceiptRow } from '@/components/inventory/ReceiptsTable';

export const dynamic = 'force-dynamic';

export default async function InventoryReceiptsPage() {
  const user = await guard();

  const { rows: movements, total } = await inventoryService.listMovements(user.id, {
    reason: 'PURCHASE_RECEIVE',
    take: 200,
  });

  // Resolve item names & PO references
  const productIds = Array.from(
    new Set(movements.filter((m) => m.itemType === 'PRODUCT').map((m) => m.itemId)),
  );
  const materialIds = Array.from(
    new Set(movements.filter((m) => m.itemType === 'MATERIAL').map((m) => m.itemId)),
  );
  const refIds = movements
    .filter((m) => m.refType === 'PurchaseOrder' && m.refId)
    .map((m) => m.refId as string);

  const [products, materials, purchaseOrders] = await Promise.all([
    productIds.length > 0
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [],
    materialIds.length > 0
      ? prisma.rawMaterial.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true } })
      : [],
    refIds.length > 0
      ? prisma.purchaseOrder.findMany({
          where: { id: { in: refIds } },
          select: { id: true, poNumber: true },
        })
      : [],
  ]);

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const materialName = new Map(materials.map((m) => [m.id, m.name]));
  const poNumber = new Map(purchaseOrders.map((p) => [p.id, p.poNumber]));

  const rows: ReceiptRow[] = movements.map((m, i) => {
    const isProduct = m.itemType === 'PRODUCT';
    const itemName = isProduct
      ? (productName.get(m.itemId) ?? m.itemId)
      : (materialName.get(m.itemId) ?? m.itemId);
    const poId = m.refType === 'PurchaseOrder' ? m.refId : null;

    return {
      id: m.id,
      number: String(1000 + i + 1),
      purchaseOrderNumber: poId ? (poNumber.get(poId) ?? null) : null,
      purchaseOrderId: poId,
      status: 'Not received',
      dateOfReceipt: m.createdAt.toISOString(),
      itemName,
      itemHref: isProduct ? `/products/${m.itemId}` : `/materials/${m.itemId}`,
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
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} {rows.length === 1 ? 'Receipt' : 'Receipts'}
            </h1>
          </div>

          <ReceiptsTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
