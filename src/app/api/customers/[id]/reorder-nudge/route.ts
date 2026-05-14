import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handled, ok, fail } from '@/lib/api-response';
import { customerReorderNudgeLink } from '@/lib/whatsapp.util';

/**
 * GET /api/customers/:id/reorder-nudge
 *
 * Returns a wa.me link the seller can tap to nudge a returning
 * customer to re-order. The link is built from:
 *   - the customer's phone (errors if absent)
 *   - days since their last CustomerOrder
 *   - the items from that last order so the seller doesn't have to
 *     type "what did you order last time?"
 *
 * Read-only: no DB writes, no message sent. The seller still has to
 * tap "Send" inside WhatsApp.
 */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const auth = await requireAuth();
    const userId = auth.owner.id;

    const customer = await prisma.customer.findFirst({
      where: { id: ctx.params.id, userId },
      select: { id: true, name: true, phone: true },
    });
    if (!customer) return fail('Customer not found', 404);
    if (!customer.phone) {
      return fail('No phone number on file for this customer.', 422);
    }

    const lastOrder = await prisma.customerOrder.findFirst({
      where: { userId, customerId: customer.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const business = await prisma.user.findUnique({
      where: { id: userId },
      select: { businessName: true, name: true },
    });
    const businessName = business?.businessName || business?.name || 'our shop';

    const daysSinceLastOrder = lastOrder
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    const link = customerReorderNudgeLink({
      phone: customer.phone,
      customerName: customer.name,
      businessName,
      daysSinceLastOrder,
      lastOrderNumber: lastOrder?.orderNumber,
      lastOrderItems: lastOrder?.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
      })),
    });

    return ok({
      link,
      daysSinceLastOrder,
      lastOrderNumber: lastOrder?.orderNumber ?? null,
      itemCount: lastOrder?.items.length ?? 0,
    });
  });
