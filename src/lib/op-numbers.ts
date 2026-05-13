import { prisma } from './prisma';

/**
 * Number generators for the operational-planning entities (customer
 * orders, production orders, purchase orders).
 *
 * The pattern mirrors `invoice-number.ts`: find the highest existing
 * sequence for this user, increment, then try up to 20 candidates in
 * case of a global @unique collision. Falls back to a userId-tagged
 * version with a timestamp suffix if every candidate is taken.
 */

async function nextNumber(
  userId: string,
  prefix: string,
  /** Lookup callback: returns the latest *number* string for this user (newest first). */
  latestForUser: (userId: string) => Promise<{ number: string } | null>,
  /** Collision check: returns true if the candidate exists globally. */
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const latest = await latestForUser(userId);
  let seq = 1;
  if (latest?.number) {
    const m = latest.number.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${prefix}-${String(seq + attempt).padStart(5, '0')}`;
    if (!(await exists(candidate))) return candidate;
  }
  const tag = userId.slice(-4).toUpperCase();
  return `${prefix}-${tag}-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export async function nextCustomerOrderNumber(userId: string): Promise<string> {
  return nextNumber(
    userId,
    'CO',
    async (uid) => {
      const row = await prisma.customerOrder.findFirst({
        where: { userId: uid },
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true },
      });
      return row ? { number: row.orderNumber } : null;
    },
    async (candidate) => {
      const hit = await prisma.customerOrder.findUnique({
        where: { orderNumber: candidate },
        select: { id: true },
      });
      return Boolean(hit);
    },
  );
}

export async function nextProductionNumber(userId: string): Promise<string> {
  return nextNumber(
    userId,
    'PRD',
    async (uid) => {
      const row = await prisma.productionOrder.findFirst({
        where: { userId: uid },
        orderBy: { createdAt: 'desc' },
        select: { productionNumber: true },
      });
      return row ? { number: row.productionNumber } : null;
    },
    async (candidate) => {
      const hit = await prisma.productionOrder.findUnique({
        where: { productionNumber: candidate },
        select: { id: true },
      });
      return Boolean(hit);
    },
  );
}

export async function nextPurchaseOrderNumber(userId: string): Promise<string> {
  return nextNumber(
    userId,
    'PO',
    async (uid) => {
      const row = await prisma.purchaseOrder.findFirst({
        where: { userId: uid },
        orderBy: { createdAt: 'desc' },
        select: { poNumber: true },
      });
      return row ? { number: row.poNumber } : null;
    },
    async (candidate) => {
      const hit = await prisma.purchaseOrder.findUnique({
        where: { poNumber: candidate },
        select: { id: true },
      });
      return Boolean(hit);
    },
  );
}
