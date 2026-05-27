import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { CustomerInvoicesTable, type CustomerInvoiceRow } from '@/components/sales/CustomerInvoicesTable';
import { CustomerInvoicesPageHeader } from '@/components/sales/CustomerInvoicesPageHeader';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const user = await guard();

  const [invoices, rawCustomers] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        customerName: true,
        customerId: true,
        totalKobo: true,
        issuedAt: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      take: 500,
      select: { id: true, name: true },
    }),
  ]);

  const rows: CustomerInvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    number: inv.invoiceNumber,
    customerName: inv.customerName,
    customerId: inv.customerId ?? null,
    invoiceDate: inv.issuedAt.toISOString(),
    orderId: null,
    orderNumber: null,
    invoiceStatus: inv.status,
    delivered: inv.paidAt ? 'Shipped' : 'Not shipped',
    heading: '',
    totalKobo: inv.totalKobo,
  }));

  const customers = rawCustomers.map((c, i) => ({
    id: c.id,
    name: c.name,
    email: null as string | null,
    number: 1001 + i,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <CustomerInvoicesPageHeader rowCount={rows.length} customers={customers} />
          <CustomerInvoicesTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
