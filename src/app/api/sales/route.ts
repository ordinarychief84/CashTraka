import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recordSaleSchema } from '@/lib/validators';
import { emailService } from '@/lib/services/email.service';
import { nairaToKobo } from '@/lib/money';

/** Generate next sale number like SLE-00042 */
async function nextSaleNumber(userId: string): Promise<string> {
  const count = await prisma.sale.count({ where: { userId } });
  return `SLE-${String(count + 1).padStart(5, '0')}`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const search = url.searchParams.get('q')?.trim();
  const sort = url.searchParams.get('sort') || 'newest';
  const method = url.searchParams.get('method');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId: user.id };

  if (from || to) {
    where.soldAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    };
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { saleNumber: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (method) {
    where.paymentMethod = method;
  }

  const orderBy =
    sort === 'oldest'
      ? { soldAt: 'asc' as const }
      : sort === 'highest'
        ? { total: 'desc' as const }
        : sort === 'lowest'
          ? { total: 'asc' as const }
          : { soldAt: 'desc' as const };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: true },
    orderBy,
    take: 200,
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = recordSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { customerName, customerPhone, customerEmail, paymentMethod, discount, note, items, sendReceipt } = parsed.data;

  const lineItems = items.map((item) => ({
    productId: item.productId || null,
    description: item.description,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    total: item.unitPrice * item.quantity,
  }));
  const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal - (discount || 0));

  const saleNumber = await nextSaleNumber(user.id);

  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        userId: user.id,
        saleNumber,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        subtotal,
        tax: 0,
        discount: discount || 0,
        total,
        subtotalKobo: nairaToKobo(subtotal),
        taxKobo: 0,
        discountKobo: nairaToKobo(discount || 0),
        totalKobo: nairaToKobo(total),
        paymentMethod,
        note: note || null,
        soldAt: new Date(),
        items: {
          create: lineItems.map((li) => ({
            productId: li.productId,
            description: li.description,
            unitPrice: li.unitPrice,
            quantity: li.quantity,
            total: li.total,
            unitPriceKobo: nairaToKobo(li.unitPrice),
            totalKobo: nairaToKobo(li.total),
          })),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      if (item.productId) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.trackStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    }

    return s;
  });

  // Send receipt email if requested and customer email is provided
  if (sendReceipt && customerEmail) {
    const businessUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { businessName: true, name: true },
    });
    const businessName = businessUser?.businessName || businessUser?.name || 'CashTraka';

    const itemRows = sale.items
      .map((i) => '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">' + i.description + '</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">' + i.quantity + '</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">N' + i.unitPrice.toLocaleString() + '</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">N' + i.total.toLocaleString() + '</td></tr>')
      .join('');

    const dateStr = new Date(sale.soldAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    const discountHtml = discount > 0
      ? '<div style="display:flex;justify-content:space-between;font-size:13px;color:#666"><span>Subtotal</span><span>N' + subtotal.toLocaleString() + '</span></div><div style="display:flex;justify-content:space-between;font-size:13px;color:#F59E0B"><span>Discount</span><span>-N' + discount.toLocaleString() + '</span></div>'
      : '';

    const html = '<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:24px">'
      + '<div style="text-align:center;margin-bottom:24px"><h2 style="color:#1A1A1A;margin:0">' + businessName + '</h2><p style="color:#666;margin:4px 0">Sales Receipt</p></div>'
      + '<div style="background:#f7f9f8;border-radius:12px;padding:16px;margin-bottom:16px"><p style="margin:0;font-size:13px;color:#666"><strong>Receipt #:</strong> ' + sale.saleNumber + '</p><p style="margin:4px 0 0;font-size:13px;color:#666"><strong>Date:</strong> ' + dateStr + '</p><p style="margin:4px 0 0;font-size:13px;color:#666"><strong>Payment:</strong> ' + sale.paymentMethod + '</p></div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#00B8E8;color:#fff"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th><th style="padding:8px 12px;text-align:right">Total</th></tr></thead><tbody>' + itemRows + '</tbody></table>'
      + '<div style="margin-top:16px;padding:12px;background:#f7f9f8;border-radius:8px">' + discountHtml + '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#1A1A1A"><span>Total</span><span>N' + total.toLocaleString() + '</span></div></div>'
      + '<p style="text-align:center;margin-top:24px;font-size:12px;color:#999">Thank you for your purchase!</p>'
      + '<p style="text-align:center;font-size:11px;color:#bbb">Powered by CashTraka</p></div>';

    emailService
      .raw({ to: customerEmail, subject: 'Receipt from ' + businessName + ' - ' + sale.saleNumber, html })
      .catch((e) => {
        console.warn(
          `[sales.POST] sale-receipt email failed for sale ${sale.id} user ${user.id}`,
          e,
        );
        return null;
      });
  }

  return NextResponse.json({ id: sale.id, saleNumber: sale.saleNumber, total: sale.total });
}
