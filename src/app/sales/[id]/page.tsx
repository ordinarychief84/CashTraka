import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { guardForBusinessType } from '@/lib/guard-rbac';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { SaleDetailClient } from '@/components/SaleDetailClient';

export const dynamic = 'force-dynamic';

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const user = await guardForBusinessType('sales');

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  if (!sale || sale.userId !== user.id) notFound();

  const businessName = user.businessName || user.name || 'CashTraka';

  // Serialise for the client component
  const data = {
    id: sale.id,
    saleNumber: sale.saleNumber,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    items: sale.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    note: sale.note,
    soldAt: sale.soldAt.toISOString(),
    businessName,
  };

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mx-auto max-w-md">
        <Link
          href="/sales"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back to Sales
        </Link>
        <SaleDetailClient sale={data} />
      </div>
    </AppShell>
  );
}
