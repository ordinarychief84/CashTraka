import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { RecipeEditor } from '@/components/ops/RecipeEditor';
import { recipesService } from '@/lib/services/recipes.service';
import { rawMaterialsService } from '@/lib/services/raw-materials.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function EditRecipePage({ params }: { params: { productId: string } }) {
  const user = await guard();
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { id: true, name: true, userId: true },
  });
  if (!product || product.userId !== user.id) notFound();

  const [recipe, { rows: materials }] = await Promise.all([
    recipesService.getForProduct(user.id, product.id),
    rawMaterialsService.listForUser(user.id, { take: 500 }),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={`Recipe — ${product.name}`}
        subtitle={recipe ? 'Update the materials needed per batch.' : 'Define the materials needed for one batch.'}
        backHref="/recipes"
      />
      <div className="card p-5">
        {materials.length === 0 ? (
          <p className="text-sm text-slate-500">
            Add some raw materials first — recipes pull from your materials list.
          </p>
        ) : (
          <RecipeEditor
            productId={product.id}
            productName={product.name}
            materials={materials.map((m) => ({
              id: m.id,
              name: m.name,
              unit: m.unit,
              unitCostKobo: m.unitCostKobo,
            }))}
            initial={
              recipe
                ? {
                    yieldQty: recipe.yieldQty,
                    recipeName: recipe.recipeName,
                    outputUnit: recipe.outputUnit,
                    status: recipe.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
                    versionNumber: recipe.versionNumber,
                    notes: recipe.notes,
                    items: recipe.items.map((it) => ({
                      materialId: it.materialId,
                      quantity: it.quantity,
                      wastageAllowancePercent: it.wastageAllowancePercent,
                      substituteAllowed: it.substituteAllowed,
                      substituteMaterialId: it.substituteMaterialId,
                      notes: it.notes,
                    })),
                  }
                : null
            }
          />
        )}
      </div>
    </AppShell>
  );
}
