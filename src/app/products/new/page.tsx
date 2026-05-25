import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ProductForm } from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const user = await guardForBusinessType('products');
  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' },
  });
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <div className="mb-4">
        <h1 className="text-2xl font-black tracking-tight text-ink">Create product</h1>
      </div>
      <ProductForm redirectTo="/products" customers={customers} />
    </AppShell>
  );
}
