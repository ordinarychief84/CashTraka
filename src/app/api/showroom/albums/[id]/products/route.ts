import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { Err } from '@/lib/errors';

export const runtime = 'nodejs';

const setSchema = z.object({
  /// Ordered list of productIds. Their position in the album follows the
  /// order in this array. Existing entries not in the list are removed.
  productIds: z.array(z.string()).max(500),
});

/**
 * POST /api/showroom/albums/[id]/products — replace the album's product set
 * with the supplied list (in order). The endpoint is intentionally
 * "set semantics" not "append" so the editor can re-render after a
 * drag-reorder by sending the whole new ordering.
 */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const album = await prisma.album.findFirst({
      where: { id: ctx.params.id, userId: user.id },
      select: { id: true },
    });
    if (!album) throw Err.notFound('Album not found');

    const body = await req.json();
    const parsed = setSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const productIds = parsed.data.productIds;
    if (productIds.length > 0) {
      const own = await prisma.product.findMany({
        where: { id: { in: productIds }, userId: user.id, archived: false },
        select: { id: true },
      });
      const ownSet = new Set(own.map((p) => p.id));
      for (const id of productIds) {
        if (!ownSet.has(id)) {
          return NextResponse.json(
            { error: `Product ${id} not found in your catalog.` },
            { status: 400 },
          );
        }
      }
    }

    await prisma.$transaction([
      prisma.albumProduct.deleteMany({ where: { albumId: album.id } }),
      ...(productIds.length > 0
        ? [
            prisma.albumProduct.createMany({
              data: productIds.map((productId, idx) => ({
                albumId: album.id,
                productId,
                position: idx,
              })),
            }),
          ]
        : []),
    ]);

    return ok({ count: productIds.length });
  });
