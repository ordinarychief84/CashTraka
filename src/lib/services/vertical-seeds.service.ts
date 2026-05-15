import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { getPack } from '@/lib/vertical-seeds';
import type { ApplyResult, SeedPack } from '@/lib/vertical-seeds';

/**
 * Apply a vertical-seed pack to a tenant. Idempotent — re-running is
 * safe and only creates rows that don't already exist (matched by
 * name + userId for materials & products, by productId for recipes).
 *
 * Why idempotent rather than transactional all-or-nothing: SMEs often
 * customise the pack after applying (rename a material, edit a recipe).
 * If they then re-apply because they discovered they wanted the rest
 * of the pack, the system shouldn't trample their edits — it should
 * merge in only the missing pieces.
 *
 * Returns counts so the UI can show "Added 12 materials, 8 products,
 * 8 recipes (3 skipped because they already existed)".
 */

export const verticalSeedsService = {
  async apply(userId: string, packId: string): Promise<ApplyResult> {
    const pack = getPack(packId);
    if (!pack) {
      throw Err.validation(`Unknown starter pack "${packId}".`);
    }

    const result: ApplyResult = {
      packId: pack.id,
      packLabel: pack.label,
      materialsCreated: 0,
      materialsSkipped: 0,
      productsCreated: 0,
      productsSkipped: 0,
      recipesCreated: 0,
      recipesSkipped: 0,
    };

    // 1. Materials — natural key (userId, name).
    const existingMaterials = await prisma.rawMaterial.findMany({
      where: {
        userId,
        deletedAt: null,
        name: { in: pack.materials.map((m) => m.name) },
      },
      select: { id: true, name: true },
    });
    const materialIdByName = new Map(existingMaterials.map((m) => [m.name, m.id]));

    for (const m of pack.materials) {
      if (materialIdByName.has(m.name)) {
        result.materialsSkipped++;
        continue;
      }
      const created = await prisma.rawMaterial.create({
        data: {
          userId,
          name: m.name,
          unit: m.unit,
          materialType: m.materialType,
          category: m.category ?? null,
          unitCostKobo: m.unitCostKobo,
          reorderLevel: m.reorderLevel,
          minimumPurchaseQuantity: m.minimumPurchaseQuantity ?? null,
          expectedLeadTimeDays: m.expectedLeadTimeDays ?? null,
          stock: 0,
        },
        select: { id: true, name: true },
      });
      materialIdByName.set(created.name, created.id);
      result.materialsCreated++;
    }

    // 2. Products — natural key (userId, name).
    const existingProducts = await prisma.product.findMany({
      where: {
        userId,
        archived: false,
        name: { in: pack.products.map((p) => p.name) },
      },
      select: { id: true, name: true },
    });
    const productIdByName = new Map(existingProducts.map((p) => [p.name, p.id]));

    for (const p of pack.products) {
      if (productIdByName.has(p.name)) {
        result.productsSkipped++;
        continue;
      }
      const created = await prisma.product.create({
        data: {
          userId,
          name: p.name,
          sku: p.sku ?? null,
          // Both legacy naira + new kobo columns get the same number-shape
          // so the dashboards that still read `price` keep working.
          price: Math.round(p.priceKobo / 100),
          priceKobo: p.priceKobo,
          cost: p.costKobo ? Math.round(p.costKobo / 100) : null,
          costKobo: p.costKobo ?? null,
          stock: 0,
          lowStockAt: p.lowStockAt ?? 3,
          category: p.category ?? null,
          canBeProduced: p.canBeProduced ?? true,
          defaultBatchSize: p.defaultBatchSize ?? null,
        },
        select: { id: true, name: true },
      });
      productIdByName.set(created.name, created.id);
      result.productsCreated++;
    }

    // 3. Recipes — natural key is productId (Recipe.productId @unique).
    for (const r of pack.recipes) {
      const productId = productIdByName.get(r.productName);
      if (!productId) {
        // Shouldn't happen unless a pack file references a product name
        // it didn't also declare — fail loudly during dev, skip in prod.
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[vertical-seeds] Recipe references missing product "${r.productName}" in pack "${pack.id}"`,
          );
        }
        continue;
      }

      const existing = await prisma.recipe.findUnique({
        where: { productId },
        select: { id: true },
      });
      if (existing) {
        result.recipesSkipped++;
        continue;
      }

      // Build the RecipeItem create list — refuse to insert items that
      // reference materials we couldn't resolve (data-integrity guard).
      const items = r.items
        .map((it) => {
          const materialId = materialIdByName.get(it.materialName);
          if (!materialId) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `[vertical-seeds] Recipe "${r.productName}" references missing material "${it.materialName}"`,
              );
            }
            return null;
          }
          return { materialId, quantity: it.quantity };
        })
        .filter((x): x is { materialId: string; quantity: number } => x !== null);

      if (items.length === 0) {
        continue;
      }

      await prisma.recipe.create({
        data: {
          userId,
          productId,
          yieldQty: r.yieldQty,
          notes: r.notes ?? null,
          status: 'ACTIVE',
          items: { create: items },
        },
      });
      result.recipesCreated++;
    }

    return result;
  },

  /** Convenience getter so the UI doesn't have to import the registry directly. */
  getPack(packId: string): SeedPack | null {
    return getPack(packId);
  },
};
