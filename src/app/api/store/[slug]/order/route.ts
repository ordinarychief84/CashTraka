import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { catalogService, hashClientIp } from '@/lib/services/catalog.service';
import { CATALOG_LIMITS } from '@/lib/catalog';

export const runtime = 'nodejs';

const bodySchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().trim().max(CATALOG_LIMITS.MAX_NAME).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  note: z.string().trim().max(CATALOG_LIMITS.MAX_NOTE).optional(),
});

/**
 * POST /api/store/[slug]/order, public catalog order click.
 * Logs a CatalogEvent and returns a wa.me link. No Payment row is created.
 *
 * CSRF-exempt (see middleware), the caller is an unauthenticated browser.
 * Rate-limited per IP at CATALOG_LIMITS.ORDER_RATE_PER_MIN (default 30/min).
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const ip = clientIp(req);
  const rl = rateLimit(`store-order:${params.slug}`, ip, {
    max: CATALOG_LIMITS.ORDER_RATE_PER_MIN,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many orders. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  try {
    const result = await catalogService.logOrderClick({
      slug: params.slug,
      productId: parsed.data.productId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      note: parsed.data.note,
      ipHash: hashClientIp(ip),
      userAgent: req.headers.get('user-agent'),
      referrer: req.headers.get('referer'),
    });
    return NextResponse.json({ ok: true, waLink: result.waLink });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message ?? 'Could not process order' },
      { status: err.status ?? 400 },
    );
  }
}
