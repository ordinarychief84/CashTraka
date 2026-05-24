import { notFound } from 'next/navigation';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductForm } from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await guardForBusinessType('products');
  const [product, customers] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.id, userId: user.id } }),
    prisma.customer.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  if (!product) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit product" backHref="/products" />
      <ProductForm
        redirectTo="/products"
        customers={customers}
        initial={{
          id: product.id,
          name: product.name,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          trackStock: product.trackStock,
          lowStockAt: product.lowStockAt,
          safetyStock: product.safetyStock,
          note: product.note ?? '',
          images: product.images ?? [],
          sku: product.sku,
          barcodeValue: product.barcodeValue,
          description: product.description,
          category: product.category,
          unitOfSale: product.unitOfSale,
          minimumSellingQuantity: product.minimumSellingQuantity,
          defaultBatchSize: product.defaultBatchSize,
          defaultProductionLeadTimeDays: product.defaultProductionLeadTimeDays,
          canBeProduced: product.canBeProduced,
          batchTracking: product.batchTracking,
          expiryTracking: product.expiryTracking,
          nafdacNumber: product.nafdacNumber,
          shelfLifeDays: product.shelfLifeDays,
          clientName: product.clientName,
          archived: product.archived,
        }}
      />
    </AppShell>
  );
}
