import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductForm } from '@/components/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Add product" backHref="/products" />
      <div className="card p-5">
        <ProductForm redirectTo="/products" />
      </div>
    </AppShell>
  );
}
