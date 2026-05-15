import { StarterPackCta } from '@/components/onboarding/StarterPackCta';
import { listPacks } from '@/lib/vertical-seeds';

/**
 * Renders every registered vertical pack as a grid of <StarterPackCta>
 * cards. Reusable across the dedicated picker page, the products
 * empty state, and the materials empty state — all four packs (or
 * however many we ship) render in one place via the registry.
 *
 * Two layout flavours:
 *   default — 2-column responsive grid (good for picker page + empty
 *             states with breathing room)
 *   compact — single-column stack (good for narrow surfaces like a
 *             sidebar prompt)
 */
export function StarterPackPicker({
  layout = 'default',
}: {
  layout?: 'default' | 'compact';
}) {
  const packs = listPacks();
  return (
    <div
      className={
        layout === 'compact'
          ? 'space-y-3'
          : 'grid gap-3 sm:grid-cols-2'
      }
    >
      {packs.map((p) => (
        <StarterPackCta
          key={p.id}
          pack={{
            id: p.id,
            label: p.label,
            description: p.description,
            emoji: p.emoji ?? null,
            materials: p.materials.length,
            products: p.products.length,
            recipes: p.recipes.length,
          }}
        />
      ))}
    </div>
  );
}
