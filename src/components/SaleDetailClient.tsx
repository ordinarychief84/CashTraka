'use client';

import { SalesReceiptView, type ReceiptSaleData } from '@/components/SalesReceiptView';

/**
 * Thin client wrapper so the sale detail page can use the interactive
 * SalesReceiptView (which needs useState for email/WhatsApp buttons).
 */
export function SaleDetailClient({ sale }: { sale: ReceiptSaleData }) {
  return <SalesReceiptView sale={sale} />;
}
