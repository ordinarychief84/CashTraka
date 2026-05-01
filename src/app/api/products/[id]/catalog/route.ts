import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, validationFail } from '@/lib/api-response';
import { Err } from '@/lib/errors';
import { CATALOG_LIMITS } from '@/lib/catalog';

export const runtime = 'nodejs';

const bodySchema = z.object({
  isPublished: z.boolean().optional(),
  images: z.array(z.string().url()).max(CATALOG_LIMITS.MAX_IMAGES).optional(),
  description: z.string().trim().max(CATALOG_LIMITS.MAX_DESCRIPTION).nullable().optional(),
  sku: z.string().trim().max(64).nullable().optional(),
  catalogStatus: z.enum(['AVAILABLE', 'LOW_STOCK', 'SOLD_OUT']).optional(),
});

/**
 * POST /api/products/[id]/catalog — update the catalog-specific fields on a
 * product (publish toggle, images, description, sku, manual status override).
 */
export const POST = (req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const product = await prisma.product.findFirst({
      where: { id: ctx.params.id, userId: user.id },
    });
    if (!product) throw Err.notFound('Product not found');

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        isPublished: parsed.data.isPublished ?? undefined,
        images: parsed.data.images ?? undefined,
        description:
          parsed.data.description === undefined ? undefined : parsed.data.description,
        sku: parsed.data.sku === undefined ? undefined : parsed.data.sku,
        catalogStatus: parsed.data.catalogStatus ?? undefined,
      },
      select: {
        id: true,
        isPublished: true,
        images: true,
        description: true,
        sku: true,
        catalogStatus: true,
      },
    });
    return ok(updated);
  });
