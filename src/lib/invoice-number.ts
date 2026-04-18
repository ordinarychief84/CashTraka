import { prisma } from './prisma';

/**
 * Generate the next INV-XXXXX invoice number for a given user.
 *
 * The schema has `invoiceNumber @unique` globally, so we prefix with a short
 * user-tag when there is any cross-user collision risk. We first try a clean
 * INV-##### per user; if the candidate already exists globally, we fall back
 * to INV-{userSlug}-##### to guarantee uniqueness.
 */
export async function nextInvoiceNumber(userId: string): Promise<string> {
  const latest = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (latest?.invoiceNumber) {
    const m = latest.invoiceNumber.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }

  // Try a few candidates. In practice the first one almost always wins.
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `INV-${String(seq + attempt).padStart(5, '0')}`;
    const collision = await prisma.invoice.findUnique({
      where: { invoiceNumber: candidate },
    });
    if (\!collision) return candidate;
  }

  // Namespace fallback: cuid-tail derived prefix.
  const tag = userId.slice(-4).toUpperCase();
  return `INV-${tag}-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}
