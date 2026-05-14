import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { getTemplate, TEMPLATE_DEMO_NOTE } from '@/lib/industry-templates';

const schema = z.object({
  industry: z.enum(['skincare', 'food', 'fashion', 'agro']),
});

/**
 * POST /api/onboarding/apply-template
 *   body: { industry: 'skincare' | 'food' | 'fashion' | 'agro' }
 *
 * One-click "seed me a usable starter setup" for a new tenant. Creates:
 *   - 1 sample Supplier
 *   - 4-5 sample RawMaterials (with reorder levels + kobo unit cost)
 *   - 1 sample finished Product (kobo selling price)
 *   - 1 sample Recipe linking the product to the materials
 *
 * Idempotent in a soft sense: if the user already has any material or
 * product, we refuse (we don't want to surprise an existing tenant).
 * If the user has zero materials AND zero products, we apply.
 *
 * All seeded rows are tagged with a `notes` marker (see
 * `TEMPLATE_DEMO_NOTE`) so the user can find + delete them later.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const template = getTemplate(parsed.data.industry);
    if (!template) return fail('Unknown industry', 422);

    // Guard: refuse if the tenant already has any ops data so we never
    // overwrite or duplicate against a live catalog.
    const [matCount, prodCount] = await Promise.all([
      prisma.rawMaterial.count({ where: { userId: user.id, deletedAt: null } }),
      prisma.product.count({ where: { userId: user.id, archived: false } }),
    ]);
    if (matCount > 0 || prodCount > 0) {
      return fail(
        'You already have products or materials. Templates only seed when your catalog is empty.',
        409,
      );
    }

    // Single transaction so a half-applied template can't strand a tenant.
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          userId: user.id,
          name: template.supplier.name,
          phone: template.supplier.phone,
          notes: TEMPLATE_DEMO_NOTE,
        },
      });

      const materials = await Promise.all(
        template.materials.map((m) =>
          tx.rawMaterial.create({
            data: {
              userId: user.id,
              name: m.name,
              unit: m.unit,
              stock: m.stock,
              reorderLevel: m.reorderLevel,
              unitCostKobo: m.unitCostKobo,
              supplierId: supplier.id,
              notes: TEMPLATE_DEMO_NOTE,
            },
          }),
        ),
      );

      const product = await tx.product.create({
        data: {
          userId: user.id,
          name: template.product.name,
          price: Math.floor(template.product.priceKobo / 100),
          priceKobo: template.product.priceKobo,
          stock: template.product.stock,
          trackStock: true,
          lowStockAt: 3,
          archived: false,
          note: TEMPLATE_DEMO_NOTE,
        },
      });

      const recipe = await tx.recipe.create({
        data: {
          userId: user.id,
          productId: product.id,
          yieldQty: 1,
          notes: TEMPLATE_DEMO_NOTE,
          items: {
            create: template.materials.map((m, i) => ({
              materialId: materials[i].id,
              quantity: m.recipeQuantity,
            })),
          },
        },
        include: { items: true },
      });

      return {
        supplierId: supplier.id,
        productId: product.id,
        recipeId: recipe.id,
        materialIds: materials.map((m) => m.id),
      };
    });

    return ok({
      industry: parsed.data.industry,
      seeded: {
        suppliers: 1,
        materials: result.materialIds.length,
        products: 1,
        recipes: 1,
      },
    });
  });
