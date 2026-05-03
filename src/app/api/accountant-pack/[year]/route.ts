import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { accountantPackService } from '@/lib/services/accountant-pack.service';
import { buildZip } from '@/lib/zip';

export const runtime = 'nodejs';

/**
 * GET /api/accountant-pack/[year]
 *
 * Streams a zip file containing every receipt, invoice, credit note,
 * payment, expense and VAT return for the given financial year, plus a
 * manifest CSV. Owner-scoped, gated on the `yearEndPack` feature flag
 * (Tax+ tier). The zip uses STORE method (no compression) via a tiny
 * built-in writer, since pulling in a full zip library for a few CSVs
 * isn't worth the dependency footprint.
 */
export async function GET(
  _req: Request,
  ctx: { params: { year: string } },
) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'yearEndPack');
    if (feature) return feature;

    const year = parseInt(ctx.params.year, 10);
    if (
      !Number.isFinite(year) ||
      year < 2000 ||
      year > new Date().getFullYear() + 1
    ) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 422 });
    }

    const pack = await accountantPackService.generateYearEndPack(user.id, year);

    const entries = [
      { name: `cashtraka-year-end-${year}/manifest.csv`, data: pack.manifest },
      ...Object.entries(pack.csvs).map(([name, data]) => ({
        name: `cashtraka-year-end-${year}/${name}`,
        data,
      })),
    ];

    const zipBuffer = buildZip(entries);
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cashtraka-year-end-${year}.zip"`,
        'Cache-Control': 'private, no-store',
        'Content-Length': String(zipBuffer.length),
      },
    });
  });
}
