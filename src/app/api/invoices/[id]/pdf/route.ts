import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoiceDoc, type InvoiceData } from '@/lib/pdf-docs';
import { displayPhone } from '@/lib/whatsapp';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/pdf → streams a PDF of the invoice.
 *
 * SECURITY: requires authentication AND ownership check.
 * Only accepts the cuid `id`, NOT the sequential invoiceNumber.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      user: {
        select: {
          name: true,
          businessName: true,
          businessAddress: true,
          whatsappNumber: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
      items: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data: InvoiceData = {
    business: invoice.user.businessName || invoice.user.name || 'Seller',
    businessAddress: invoice.user.businessAddress,
    whatsappNumber: invoice.user.whatsappNumber
      ? displayPhone(invoice.user.whatsappNumber)
      : null,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    customerName: invoice.customerName,
    customerPhone: displayPhone(invoice.customerPhone),
    customerEmail: invoice.customerEmail,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    note: invoice.note,
    items: invoice.items.map((i) => ({
      description: i.description,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    })),
    bank: {
      name: invoice.user.bankName,
      accountNumber: invoice.user.bankAccountNumber,
      accountName: invoice.user.bankAccountName,
    },
  };

  const buffer = await renderToBuffer(InvoiceDoc({ data }));
  const filename = `invoice-${invoice.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
