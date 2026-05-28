import { requireAuth } from '@/lib/auth';
import { handled } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * On-demand CSV exports for Settings > Data export.
 *
 * Each `type` maps to one query against the live tenant data. The
 * file is streamed in one response (no temp storage). Suited for
 * small/medium tenants — anything north of ~50k rows should move
 * to a background-job + signed-URL pattern later.
 */

type ExportType =
  | 'customers'
  | 'customer-groups'
  | 'customer-contacts'
  | 'suppliers'
  | 'supplier-groups'
  | 'inventory'
  | 'inventory-movements'
  | 'defaults';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  // Wrap in quotes if it contains a comma, quote, newline, or leading
  // formula-injection chars.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvEscape).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(','))
    .join('\n');
  return header + '\n' + body + (body ? '\n' : '');
}

function attach(name: string, csv: string): NextResponse {
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cashtraka-${name}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  return handled(async () => {
    const { owner } = await requireAuth();
    const type = params.type as ExportType;

    switch (type) {
      case 'customers': {
        const rows = await prisma.customer.findMany({
          where: { userId: owner.id },
          orderBy: { name: 'asc' },
          select: {
            id: true, name: true, phone: true,
            totalPaidKobo: true, totalOwedKobo: true,
            transactionCount: true, lastActivityAt: true, createdAt: true,
          },
        });
        const csv = toCsv(
          rows.map((r) => ({
            ...r,
            totalPaidNGN: (r.totalPaidKobo / 100).toFixed(2),
            totalOwedNGN: (r.totalOwedKobo / 100).toFixed(2),
            lastActivityAt: r.lastActivityAt.toISOString(),
            createdAt: r.createdAt.toISOString(),
          })),
          ['id','name','phone','totalPaidNGN','totalOwedNGN','transactionCount','lastActivityAt','createdAt'],
        );
        return attach('customers', csv);
      }

      case 'customer-contacts': {
        // Customer.phone is non-nullable in this schema, so we just
        // filter out empty strings to keep the export contact-only.
        const rows = await prisma.customer.findMany({
          where: { userId: owner.id, NOT: { phone: '' } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, phone: true },
        });
        const csv = toCsv(rows, ['id', 'name', 'phone']);
        return attach('customer-contacts', csv);
      }

      case 'customer-groups': {
        // We don't have a CustomerGroup model yet — return an empty
        // header-only CSV so the download still works as a template.
        const csv = toCsv([], ['id', 'name', 'discountPct']);
        return attach('customer-groups', csv);
      }

      case 'suppliers': {
        const rows = await prisma.supplier.findMany({
          where: { userId: owner.id, deletedAt: null },
          orderBy: { name: 'asc' },
          select: {
            id: true, name: true, contactPerson: true, phone: true,
            email: true, address: true, paymentTerms: true,
            status: true, createdAt: true,
          },
        });
        const csv = toCsv(
          rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
          ['id','name','contactPerson','phone','email','address','paymentTerms','status','createdAt'],
        );
        return attach('suppliers', csv);
      }

      case 'supplier-groups': {
        const csv = toCsv([], ['id', 'name']);
        return attach('supplier-groups', csv);
      }

      case 'inventory': {
        const products = await prisma.product.findMany({
          where: { userId: owner.id, archived: false },
          orderBy: { name: 'asc' },
          select: {
            id: true, name: true, sku: true, stock: true,
            priceKobo: true, lowStockAt: true, trackStock: true,
            createdAt: true,
          },
        });
        const csv = toCsv(
          products.map((p) => ({
            ...p,
            priceNGN: (p.priceKobo / 100).toFixed(2),
            createdAt: p.createdAt.toISOString(),
          })),
          ['id','name','sku','stock','priceNGN','lowStockAt','trackStock','createdAt'],
        );
        return attach('inventory', csv);
      }

      case 'inventory-movements': {
        const rows = await prisma.stockMovement.findMany({
          where: { userId: owner.id },
          orderBy: { createdAt: 'desc' },
          take: 5000, // Cap so we don't accidentally stream millions of rows.
          select: {
            id: true, itemType: true, itemId: true, reason: true,
            delta: true, balanceAfter: true, refType: true, refId: true,
            notes: true, createdAt: true,
          },
        });
        const csv = toCsv(
          rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
          ['id','itemType','itemId','reason','delta','balanceAfter','refType','refId','notes','createdAt'],
        );
        return attach('inventory-movements', csv);
      }

      case 'defaults': {
        const u = owner as any;
        const csv = toCsv(
          [
            {
              key: 'defaultCurrency',
              value: u.defaultCurrency,
            },
            {
              key: 'defaultItemUnit',
              value: u.defaultItemUnit ?? '',
            },
            {
              key: 'defaultCustomerCurrency',
              value: u.defaultCustomerCurrency ?? '',
            },
            {
              key: 'defaultCustomerPaymentTerm',
              value: u.defaultCustomerPaymentTerm ?? '',
            },
            {
              key: 'defaultSupplierCurrency',
              value: u.defaultSupplierCurrency ?? '',
            },
            {
              key: 'defaultSupplierPaymentTerm',
              value: u.defaultSupplierPaymentTerm ?? '',
            },
            {
              key: 'priceDecimals',
              value: u.priceDecimals ?? 2,
            },
            {
              key: 'quantityDecimals',
              value: u.quantityDecimals ?? 2,
            },
            {
              key: 'dateFormat',
              value: u.dateFormat ?? 'DD-MM-YYYY',
            },
            {
              key: 'generalStartingNumber',
              value: u.generalStartingNumber ?? 1001,
            },
          ],
          ['key', 'value'],
        );
        return attach('defaults', csv);
      }

      default:
        return NextResponse.json(
          { error: `Unknown export type: ${params.type}` },
          { status: 400 },
        );
    }
  });
}
