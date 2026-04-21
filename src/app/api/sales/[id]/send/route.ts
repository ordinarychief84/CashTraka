import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { emailService } from '@/lib/services/email.service';

/**
 * POST /api/sales/[id]/send
 *
 * Re-sends a receipt for an existing sale.
 * Body: { channel: 'email' }
 *
 * WhatsApp is handled client-side via deep links, so only email
 * needs a server route.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!sale || sale.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const channel = body.channel || 'email';

  if (channel !== 'email') {
    return NextResponse.json({ error: 'Unsupported channel' }, { status: 400 });
  }

  if (!sale.customerEmail) {
    return NextResponse.json({ error: 'No customer email on this sale' }, { status: 400 });
  }

  // Fetch business info
  const biz = await prisma.user.findUnique({
    where: { id: user.id },
    select: { businessName: true, name: true },
  });
  const businessName = biz?.businessName || biz?.name || 'CashTraka';

  // Build HTML receipt
  const itemRows = sale.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333">${i.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#666">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;color:#333">₦${i.unitPrice.toLocaleString()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;color:#1A1A1A">₦${i.total.toLocaleString()}</td>
        </tr>`,
    )
    .join('');

  const dateStr = new Date(sale.soldAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="color:#1A1A1A;margin:0;font-size:20px">${businessName}</h2>
        <p style="color:#888;margin:4px 0 0;font-size:13px">Sales Receipt</p>
      </div>

      <div style="background:#f7f9f8;border-radius:10px;padding:14px;margin-bottom:20px">
        <table style="width:100%;font-size:13px;color:#555">
          <tr><td style="padding:2px 0"><strong>Receipt #:</strong></td><td style="text-align:right">${sale.saleNumber}</td></tr>
          <tr><td style="padding:2px 0"><strong>Date:</strong></td><td style="text-align:right">${dateStr}</td></tr>
          <tr><td style="padding:2px 0"><strong>Payment:</strong></td><td style="text-align:right">${sale.paymentMethod}</td></tr>
          ${sale.customerName ? `<tr><td style="padding:2px 0"><strong>Customer:</strong></td><td style="text-align:right">${sale.customerName}</td></tr>` : ''}
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#00B8E8;color:#fff">
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding:14px;background:#f7f9f8;border-radius:10px">
        ${
          sale.discount > 0
            ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:6px">
                <span>Subtotal</span><span>₦${sale.subtotal.toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#F59E0B;margin-bottom:8px">
                <span>Discount</span><span>-₦${sale.discount.toLocaleString()}</span>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#1A1A1A;${sale.discount > 0 ? 'padding-top:8px;border-top:1px solid #ddd' : ''}">
          <span>Total</span><span>₦${sale.total.toLocaleString()}</span>
        </div>
      </div>

      <p style="text-align:center;margin-top:28px;font-size:13px;color:#888">Thank you for your purchase!</p>
      <p style="text-align:center;font-size:11px;color:#bbb;margin-top:4px">Powered by CashTraka</p>
    </div>
  `;

  const result = await emailService.raw({
    to: sale.customerEmail,
    subject: `Receipt from ${businessName} — ${sale.saleNumber}`,
    html,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
