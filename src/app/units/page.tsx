import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { UnitsTable } from '@/components/items/UnitsTable';

export const dynamic = 'force-dynamic';

// Built-in unit presets (always shown)
const PRESET_UNITS = [
  { name: 'Piece',   abbreviation: 'pc',   packagingCode: '', barcode: '' },
  { name: 'Kilogram',abbreviation: 'kg',   packagingCode: '', barcode: '' },
  { name: 'Gram',    abbreviation: 'g',    packagingCode: '', barcode: '' },
  { name: 'Litre',   abbreviation: 'L',    packagingCode: '', barcode: '' },
  { name: 'Millilitre', abbreviation: 'ml',packagingCode: '', barcode: '' },
  { name: 'Metre',   abbreviation: 'm',    packagingCode: '', barcode: '' },
  { name: 'Pack',    abbreviation: 'pack', packagingCode: '', barcode: '' },
  { name: 'Carton',  abbreviation: 'ctn',  packagingCode: '', barcode: '' },
  { name: 'Box',     abbreviation: 'box',  packagingCode: '', barcode: '' },
  { name: 'Dozen',   abbreviation: 'dz',   packagingCode: '', barcode: '' },
  { name: 'Bag',     abbreviation: 'bag',  packagingCode: '', barcode: '' },
  { name: 'Bottle',  abbreviation: 'btl',  packagingCode: '', barcode: '' },
];

export default async function UnitsPage() {
  const user = await guard();

  // Collect distinct unitOfSale values from products
  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false, unitOfSale: { not: null } },
    select: { unitOfSale: true },
  });
  const customUnits = Array.from(
    new Set(products.map((p) => p.unitOfSale!).filter(Boolean))
  );

  // Merge: presets + any custom ones not already in presets
  const presetNames = new Set(PRESET_UNITS.map((u) => u.name.toLowerCase()));
  const extraUnits = customUnits
    .filter((u) => !presetNames.has(u.toLowerCase()))
    .map((u) => ({ name: u, abbreviation: '', packagingCode: '', barcode: '' }));

  const units = [...PRESET_UNITS, ...extraUnits];

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {units.length} Units
            </h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              + Create new
            </button>
          </div>

          <UnitsTable units={units} />
        </div>
      </div>
    </AppShell>
  );
}
