import { NextResponse } from 'next/server';
import { receiptService } from '@/lib/services/receipt.service';

export const runtime = 'nodejs';

/**
 * GET /api/receipts/[id]
 *
 * Public — mirrors the /r/[id] page in exposure (the id is an unguessable
 * cuid). Accepts either a Receipt.id OR a Payment.id for backward compat with
 * older receipt links.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { buffer, filename } = await receiptService.streamPdfPublic(params.id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (e: any) {
    if (e?.code === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (process.env.NODE_ENV !== 'production') console.error(e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
