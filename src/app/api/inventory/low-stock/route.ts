import { requireAuth } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * GET /api/inventory/low-stock
 *   ?scope=materials|products|all (default: all)
 */
export const GET = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') ?? 'all') as 'materials' | 'products' | 'all';
    if (scope === 'materials') {
      const materials = await inventoryService.computeLowStockMaterials(auth.owner.id);
      return ok({ materials, products: [] });
    }
    if (scope === 'products') {
      const products = await inventoryService.computeLowStockProducts(auth.owner.id);
      return ok({ products, materials: [] });
    }
    const [materials, products] = await Promise.all([
      inventoryService.computeLowStockMaterials(auth.owner.id),
      inventoryService.computeLowStockProducts(auth.owner.id),
    ]);
    return ok({ materials, products });
  });
