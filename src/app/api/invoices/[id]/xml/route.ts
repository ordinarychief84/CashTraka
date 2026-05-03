import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';
import { invoiceXmlService } from '@/lib/services/invoice-xml.service';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/xml → streams the internal CashTraka XML.
 *
 * This is the archivable internal format, NOT the FIRS Merchant Buyer
 * Solution wire-format — that lives behind firs-invoice.service.ts and
 * its real adapter.
 *
 * Owner-only. Stamps `xmlGeneratedAt` and writes an XML_GENERATED audit
 * row the first time it's hit (idempotent).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = await requireFeature(user, 'electronicXml');
  if (feature) return feature;

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      items: true,
      user: {
        select: {
          businessName: true,
          name: true,
          businessAddress: true,
          tin: true,
          whatsappNumber: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const xml = invoiceXmlService.invoiceToXml({
    invoice,
    seller: invoice.user,
  });

  if (!invoice.xmlGeneratedAt) {
    await prisma.invoice
      .update({
        where: { id: invoice.id },
        data: { xmlGeneratedAt: new Date() },
      })
      .catch(() => null);
    await documentAudit.log({
      userId: user.id,
      actorId: user.id,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'XML_GENERATED',
    });
  }

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.xml"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
