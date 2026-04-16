import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { InvoiceDoc, type InvoiceData } from '@/lib/pdf-docs';
import { displayPhone } from '@/lib/whatsapp';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/pdf → streams a PDF of the invoice.
 * Accepts either the cuid `id` OR the human invoice number via query:
 *   /api/invoices/by-number/INV-00042/pdf → not used, we accept number via /[id] too.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Find by id OR by invoiceNumber — makes the public share-link experience seamless.
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ id: params.id }, { invoiceNumber: params.id }],
    },
    include: {
      user: {
        select: {
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
    business: invoice.user.businessName || 'Seller',
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
