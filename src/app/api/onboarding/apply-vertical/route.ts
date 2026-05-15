import { requireAuth } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { verticalSeedsService } from '@/lib/services/vertical-seeds.service';
import { listPacks } from '@/lib/vertical-seeds';

/**
 * GET /api/onboarding/apply-vertical
 *
 * Returns the metadata for every available starter pack — id, label,
 * description, emoji, and the counts of materials / products / recipes.
 * Used by the picker UI to render cards. Cheap, no DB hit beyond auth.
 */
export const GET = () =>
  handled(async () => {
    await requireAuth();
    const packs = listPacks().map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      emoji: p.emoji ?? null,
      materials: p.materials.length,
      products: p.products.length,
      recipes: p.recipes.length,
    }));
    return ok(packs);
  });

/**
 * POST /api/onboarding/apply-vertical
 * Body: { packId: 'skincare' | ... }
 *
 * Applies the pack to the authenticated tenant. Idempotent — re-running
 * only adds the missing pieces (see verticalSeedsService.apply notes).
 * Returns counts of what was created vs skipped.
 */
export const POST = (req: Request) =>
  handled(async () => {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const packId = typeof body?.packId === 'string' ? body.packId.trim() : '';
    if (!packId) {
      return fail('packId is required.', 400);
    }
    const result = await verticalSeedsService.apply(auth.owner.id, packId);
    return ok(result);
  });
