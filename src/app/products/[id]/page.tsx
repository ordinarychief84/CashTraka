import { redirect } from 'next/navigation';

/**
 * Product detail entry-point. Until a dedicated read-only view ships,
 * this redirects straight to the edit page so the ~10 inbound links
 * across the app (inventory adjustments, movements, receipts,
 * reports/operations, dashboard OperationalRiskPanel, …) don't 404.
 *
 * The edit page enforces tenant ownership via `guard()` + the product
 * service, so the redirect is safe — wrong-tenant access still 404s
 * at the edit-page layer.
 */
export default function ProductDetailPage({ params }: { params: { id: string } }) {
  redirect(`/products/${params.id}/edit`);
}
