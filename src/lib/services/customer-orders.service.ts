import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { documentAudit } from '@/lib/services/document-audit.service';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { emailService } from '@/lib/services/email.service';
import {
  customerOrderConfirmationLink,
  productionCompletedLink,
} from '@/lib/whatsapp.util';
import { nextCustomerOrderNumber } from '@/lib/op-numbers';
import { makePublicToken } from '@/lib/invoice-helpers';

type CustomerOrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<CustomerOrderStatus, CustomerOrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'READY', 'CANCELLED'],
  IN_PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export type CustomerOrderCreateItem = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPriceKobo: number;
  discountKobo?: number;
  lineNotes?: string | null;
};

export type CustomerOrderCreateInput = {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  dueAt?: Date | null;
  notes?: string | null;
  items: CustomerOrderCreateItem[];
  /** Bundle B: operational meta */
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  paymentStatus?: 'UNPAID' | 'PART_PAID' | 'PAID';
  source?: 'WHATSAPP' | 'WALK_IN' | 'INSTAGRAM' | 'WEBSITE' | 'REFERRAL' | 'OTHER';
  deliveryMethod?: 'PICKUP' | 'DELIVERY' | 'DISPATCH' | 'THIRD_PARTY';
  deliveryAddress?: string | null;
  deliveryNote?: string | null;
  assignedTo?: string | null;
  internalNote?: string | null;
};

export const customerOrdersService = {
  async listForUser(
    userId: string,
    opts?: {
      status?: CustomerOrderStatus | CustomerOrderStatus[];
      customerId?: string;
      take?: number;
      skip?: number;
    },
  ) {
    const take = Math.min(opts?.take ?? 50, 200);
    const skip = Math.max(opts?.skip ?? 0, 0);
    const statusFilter = Array.isArray(opts?.status)
      ? { in: opts!.status }
      : opts?.status
        ? { equals: opts.status }
        : undefined;
    const where = {
      userId,
      deletedAt: null,
      ...(opts?.customerId ? { customerId: opts.customerId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.customerOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: true,
          productionOrder: { select: { id: true, productionNumber: true, status: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true, total: true } },
        },
        take,
        skip,
      }),
      prisma.customerOrder.count({ where }),
    ]);
    return { rows, total };
  },

  async getForUser(userId: string, customerOrderId: string) {
    const order = await prisma.customerOrder.findUnique({
      where: { id: customerOrderId },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        productionOrder: { include: { items: true } },
        invoice: true,
      },
    });
    if (!order || order.userId !== userId) {
      throw Err.notFound('Customer order not found');
    }
    return order;
  },

  async create(
    userId: string,
    input: CustomerOrderCreateInput,
    actorId?: string | null,
  ) {
    // Note: empty items array is allowed — order is created in NEW (draft)
    // status and items get added on the detail page. Status transitions to
    // CONFIRMED / IN_PRODUCTION will guard against zero-item orders.
    if (input.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer || customer.userId !== userId) {
        throw Err.validation('Customer not found.');
      }
    }
    if (input.items.some((i) => i.productId)) {
      const productIds = Array.from(
        new Set(input.items.map((i) => i.productId).filter(Boolean) as string[]),
      );
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, userId, archived: false },
        select: { id: true },
      });
      if (products.length !== productIds.length) {
        throw Err.validation('One or more products are unavailable.');
      }
    }

    const lines = input.items.map((it) => {
      const quantity = Math.max(1, Math.floor(it.quantity));
      const unitPriceKobo = Math.max(0, Math.floor(it.unitPriceKobo));
      const discountKobo = Math.max(0, Math.floor(it.discountKobo ?? 0));
      const gross = unitPriceKobo * quantity;
      return {
        productId: it.productId ?? null,
        description: it.description.trim(),
        quantity,
        unitPriceKobo,
        discountKobo,
        totalKobo: Math.max(0, gross - discountKobo),
        lineNotes: it.lineNotes?.trim() || null,
      };
    });
    const totalKobo = lines.reduce((sum, l) => sum + l.totalKobo, 0);

    const orderNumber = await nextCustomerOrderNumber(userId);

    const order = await prisma.customerOrder.create({
      data: {
        userId,
        customerId: input.customerId ?? null,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone?.trim() || null,
        orderNumber,
        status: 'NEW',
        priority: input.priority ?? 'NORMAL',
        paymentStatus: input.paymentStatus ?? 'UNPAID',
        source: input.source ?? null,
        deliveryMethod: input.deliveryMethod ?? null,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        deliveryNote: input.deliveryNote?.trim() || null,
        assignedTo: input.assignedTo ?? null,
        internalNote: input.internalNote?.trim() || null,
        dueAt: input.dueAt ?? null,
        notes: input.notes?.trim() || null,
        totalKobo,
        items: { create: lines },
      },
      include: { items: true, customer: true },
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'CUSTOMER_ORDER',
      entityId: order.id,
      action: 'CREATED',
      metadata: { orderNumber: order.orderNumber, totalKobo, items: lines.length },
    });

    return order;
  },

  /**
   * State-machine transition. On confirmation we (a) fire an email +
   * generate a WhatsApp link, and (b) auto-spawn a ProductionOrder if
   * any line has a productId (best-effort; failure to spawn does not
   * block the status change).
   *
   * On READY we fire the "your order is ready" notification.
   */
  async updateStatus(
    userId: string,
    customerOrderId: string,
    nextStatus: CustomerOrderStatus,
    reason?: string | null,
    actorId?: string | null,
  ) {
    const order = await this.getForUser(userId, customerOrderId);
    const current = order.status as CustomerOrderStatus;
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw Err.conflict(
        `Cannot transition customer order from ${current} to ${nextStatus}.`,
      );
    }

    // Guard against advancing a zero-item draft — orders need at least one
    // line before they can be confirmed, sent to production, or invoiced.
    const lineCount = order.items?.length ?? 0;
    const requiresItems: CustomerOrderStatus[] = ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'];
    if (requiresItems.includes(nextStatus) && lineCount === 0) {
      throw Err.validation(
        `Add at least one line item before transitioning to ${nextStatus}.`,
      );
    }

    const updated = await prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'CANCELLED' ? { deletedAt: new Date() } : {}),
      },
      include: { items: true, customer: true, productionOrder: true, invoice: true },
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'CUSTOMER_ORDER',
      entityId: order.id,
      action: nextStatus === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGED',
      metadata: { from: current, to: nextStatus, ...(reason ? { reason } : {}) },
    });

    // Side effects (best-effort; never block the transition).
    if (nextStatus === 'CONFIRMED' && !order.productionOrderId) {
      const productLinked = order.items.some((it) => it.productId);
      if (productLinked) {
        try {
          await productionOrdersService.createFromCustomerOrder(
            userId,
            order.id,
            actorId,
          );
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[customer-orders] spawn production failed', e);
          }
        }
      }
      await this.sendConfirmationNotification(userId, updated.id);
    }
    if (nextStatus === 'READY') {
      await this.sendReadyNotification(userId, updated.id);
    }

    return updated;
  },

  /**
   * Spawn a ProductionOrder explicitly via the /produce route. Returns
   * the production order + computed shortages.
   */
  async spawnProduction(
    userId: string,
    customerOrderId: string,
    actorId?: string | null,
  ) {
    const order = await this.getForUser(userId, customerOrderId);
    if (order.deletedAt || order.status === 'CANCELLED') {
      throw Err.conflict('Cannot spawn production for a cancelled order.');
    }
    return productionOrdersService.createFromCustomerOrder(
      userId,
      order.id,
      actorId,
    );
  },

  /**
   * Spawn an Invoice for the customer order. Idempotent: if an invoice
   * already exists, returns it. Uses the existing Invoice pattern
   * (publicToken, item snapshots in NGN + kobo). Tax is OFF by default —
   * the seller can edit the invoice afterwards to apply VAT.
   */
  async spawnInvoice(
    userId: string,
    customerOrderId: string,
    actorId?: string | null,
  ) {
    const order = await this.getForUser(userId, customerOrderId);
    if (order.invoiceId && order.invoice) {
      return order.invoice;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { invoicePrefix: true },
    });
    const prefix =
      user?.invoicePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';

    // Mint an invoice number using a small retry loop. We use the
    // simple `findFirst({orderBy: createdAt})` pattern (same shape as
    // nextInvoiceNumber) — sufficient for the small per-tenant volume.
    const invoiceNumber = await this.nextInvoiceNumber(userId, prefix);

    const subtotalKobo = order.totalKobo;
    const items = order.items.map((it) => ({
      productId: it.productId ?? null,
      description: it.description,
      unitPrice: Math.round(it.unitPriceKobo / 100),
      unitPriceKobo: it.unitPriceKobo,
      quantity: it.quantity,
      itemType: 'GOODS' as const,
      vatExempt: false,
    }));

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        customerId: order.customerId,
        invoiceNumber,
        publicToken: makePublicToken(),
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? '',
        customerEmail: order.customer?.phone?.includes('@')
          ? order.customer.phone
          : null,
        status: 'DRAFT',
        subtotal: Math.round(subtotalKobo / 100),
        discount: 0,
        tax: 0,
        total: Math.round(subtotalKobo / 100),
        subtotalKobo,
        discountKobo: 0,
        taxKobo: 0,
        totalKobo: subtotalKobo,
        vatApplied: false,
        vatRate: 0,
        note: `From customer order ${order.orderNumber}`,
        dueDate: order.dueAt ?? null,
        items: { create: items },
      },
    });

    await prisma.customerOrder.update({
      where: { id: order.id },
      data: { invoiceId: invoice.id },
    });

    await documentAudit.log({
      userId,
      actorId: actorId ?? null,
      entityType: 'CUSTOMER_ORDER',
      entityId: order.id,
      action: 'CONVERTED',
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    });

    return invoice;
  },

  /**
   * Tiny number generator inlined to avoid pulling in invoice-helpers'
   * raw-SQL `nextDocumentNumber` (which uses prefix-based discovery
   * across all invoices — fine but unnecessary heft for one call site).
   */
  async nextInvoiceNumber(userId: string, prefix: string): Promise<string> {
    const latest = await prisma.invoice.findFirst({
      where: { userId, invoiceNumber: { startsWith: `${prefix}-` } },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    let seq = 1;
    if (latest?.invoiceNumber) {
      const m = latest.invoiceNumber.match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = `${prefix}-${String(seq + attempt).padStart(5, '0')}`;
      const clash = await prisma.invoice.findUnique({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    const tag = userId.slice(-4).toUpperCase();
    return `${prefix}-${tag}-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  },

  // ── Notifications (best-effort) ─────────────────────────────────

  async sendConfirmationNotification(userId: string, customerOrderId: string) {
    const [order, owner] = await Promise.all([
      this.getForUser(userId, customerOrderId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { businessName: true, name: true },
      }),
    ]);
    const businessName = owner?.businessName || owner?.name || 'CashTraka';

    const email = order.customer?.phone?.includes('@')
      ? order.customer.phone
      : null;

    let emailResult: { ok: boolean; id?: string; error?: string } | null = null;
    if (email) {
      emailResult = await emailService.sendCustomerOrderConfirmation({
        to: email,
        customerName: order.customerName,
        businessName,
        orderNumber: order.orderNumber,
        items: order.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo,
        })),
        totalKobo: order.totalKobo,
        dueAt: order.dueAt,
        notes: order.notes,
      });
    }

    const whatsappLink = order.customerPhone
      ? customerOrderConfirmationLink({
          phone: order.customerPhone,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          businessName,
          totalKobo: order.totalKobo,
          dueAt: order.dueAt,
          items: order.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
          })),
        })
      : null;

    return { emailResult, whatsappLink };
  },

  async sendReadyNotification(userId: string, customerOrderId: string) {
    const [order, owner] = await Promise.all([
      this.getForUser(userId, customerOrderId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { businessName: true, name: true },
      }),
    ]);
    const businessName = owner?.businessName || owner?.name || 'CashTraka';

    const email = order.customer?.phone?.includes('@')
      ? order.customer.phone
      : null;

    let emailResult: { ok: boolean; id?: string; error?: string } | null = null;
    if (email) {
      emailResult = await emailService.sendProductionCompleted({
        to: email,
        customerName: order.customerName,
        businessName,
        orderNumber: order.orderNumber,
      });
    }

    const whatsappLink = order.customerPhone
      ? productionCompletedLink({
          phone: order.customerPhone,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          businessName,
        })
      : null;

    return { emailResult, whatsappLink };
  },
};
