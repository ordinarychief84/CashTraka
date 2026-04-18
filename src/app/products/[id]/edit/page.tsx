import { notFound } from 'next/navigation';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductForm } from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await guardForBusinessType('products');
  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!product) notFound();

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Edit product" backHref="/products" />
      <div className="card p-5">
        <ProductForm
          redirectTo="/products"
          initial={{
            id: product.id,
            name: product.name,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            trackStock: product.trackStock,
            lowStockAt: product.lowStockAt,
            note: product.note ?? '',
          }}
        />
      </div>
    </AppShell>
  );
}
