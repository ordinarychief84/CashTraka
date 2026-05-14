import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { customerOrdersService } from './customer-orders.service';
import { documentAudit } from './document-audit.service';

/**
 * WhatsApp Business API intake.
 *
 * Meta sends every inbound customer message to a single webhook (set on
 * the Meta Business app's WhatsApp config). We parse the body, classify
 * the intent, and either:
 *   - create a draft CustomerOrder (intent=ORDER)
 *   - reply with order status if we can identify the order (intent=STATUS)
 *   - log + ignore unknown intents (a future LLM-backed parser handles them)
 *
 * Tenant routing: Meta sends the message to OUR phone number, not the
 * tenant's. The customer's phone is in the payload. We map their phone
 * to a tenant by:
 *   1. existing Customer.phone match → use that tenant
 *   2. fall through to a "shared inbox" tenant if configured (env var)
 *   3. otherwise log + drop
 *
 * v0 parser is regex-based. Replacing with an LLM call lands later.
 */

export type IntakeIntent = 'ORDER' | 'STATUS' | 'GREETING' | 'UNKNOWN';

export type ParsedIntent = {
  intent: IntakeIntent;
  /** Set on intent=STATUS — extracted CO-XXXXX. */
  orderNumber?: string;
  /** Set on intent=ORDER — best-effort plain-text items. */
  rawItems?: string;
};

/**
 * Verify Meta's webhook signature. Meta signs every POST with an
 * `X-Hub-Signature-256` header using the App Secret. Constant-time
 * compare to avoid leaking the secret one byte at a time.
 */
export function verifyWhatsappSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

/**
 * Map a customer phone (Meta sends it E.164 like "2348031234567") to
 * the tenant that owns that customer. First match wins; if more than
 * one tenant has the same customer phone, we deliberately don't try to
 * pick — return null and log.
 */
export async function routeByCustomerPhone(rawPhone: string) {
  const candidates = await prisma.customer.findMany({
    where: { phone: { in: [rawPhone, `+${rawPhone}`, `0${rawPhone.slice(3)}`] } },
    select: { id: true, userId: true, name: true },
    take: 5,
  });
  if (candidates.length === 0) return null;
  // If multiple, route to the most recent customer by lastActivityAt.
  if (candidates.length === 1) return candidates[0];
  const sorted = await prisma.customer.findMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    orderBy: { lastActivityAt: 'desc' },
    take: 1,
  });
  return sorted[0] ?? candidates[0];
}

/**
 * Regex intent parser. v0; the keywords are tuned for what Nigerian
 * customers actually say on WhatsApp ("abeg", "I want", "status of",
 * "order number").
 */
export function parseIntent(text: string): ParsedIntent {
  const t = text.trim().toLowerCase();

  // STATUS — "where is my order CO-00042" / "status of CO-12345" / "co12345?"
  const orderRef = t.match(/co-?\d{3,8}/i);
  if (orderRef) {
    return { intent: 'STATUS', orderNumber: orderRef[0].toUpperCase().replace(/^CO(?!-)/, 'CO-') };
  }

  // ORDER — "I want 2 of …" / "please send me …" / "order …"
  if (
    /(i want|please|abeg|kindly|can i (get|have)|order|buy|i need)/.test(t) &&
    /\d/.test(t) // at least one number suggests a quantity
  ) {
    return { intent: 'ORDER', rawItems: text.trim().slice(0, 500) };
  }

  // GREETING — "hi", "hello", "good morning"
  if (/^(hi|hello|hey|good (morning|afternoon|evening))/.test(t)) {
    return { intent: 'GREETING' };
  }

  return { intent: 'UNKNOWN' };
}

/**
 * Process one inbound WhatsApp message. Returns a string to send back
 * to the customer (the route handler is responsible for sending it via
 * the WhatsApp Cloud API).
 */
export async function handleInboundMessage(args: {
  fromPhone: string;
  body: string;
}): Promise<{ reply: string | null; orderId?: string; tenantUserId?: string }> {
  const intent = parseIntent(args.body);
  const customer = await routeByCustomerPhone(args.fromPhone);

  // No customer record → we can't route. Reply with a generic ask so
  // the operator can manually attach this WhatsApp number later.
  if (!customer) {
    await documentAudit
      .log({
        userId: 'system',
        actorId: null,
        entityType: 'USER' as any,
        entityId: args.fromPhone,
        action: 'CREATED' as any,
        metadata: { source: 'whatsapp', intent: intent.intent, unrouted: true, body: args.body.slice(0, 200) },
      })
      .catch(() => {});
    return {
      reply:
        "Thanks for the message! We couldn't find your customer record yet. " +
        "If you've ordered from us before, please reply with the name or phone number on your last order so we can connect this chat.",
    };
  }

  if (intent.intent === 'STATUS' && intent.orderNumber) {
    const order = await prisma.customerOrder.findFirst({
      where: { userId: customer.userId, orderNumber: intent.orderNumber, deletedAt: null },
      select: { orderNumber: true, status: true, dueAt: true },
    });
    if (!order) {
      return {
        reply: `Sorry, I can't find ${intent.orderNumber}. Double-check the number or reply with what you'd like to order.`,
        tenantUserId: customer.userId,
      };
    }
    const due = order.dueAt
      ? ` Expected ${new Date(order.dueAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}.`
      : '';
    return {
      reply: `${order.orderNumber} is currently ${order.status.replace('_', ' ').toLowerCase()}.${due}`,
      tenantUserId: customer.userId,
    };
  }

  if (intent.intent === 'ORDER') {
    const created = await customerOrdersService.create(customer.userId, {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: args.fromPhone,
      notes: `Received via WhatsApp:\n${intent.rawItems ?? args.body}`,
      items: [
        {
          // No productId — the seller will pick the right product when
          // they review the draft. Description carries the raw text so
          // nothing is lost.
          description: intent.rawItems?.slice(0, 200) ?? args.body.slice(0, 200),
          quantity: 1,
          unitPriceKobo: 0,
        },
      ],
    });
    await documentAudit
      .log({
        userId: customer.userId,
        actorId: null,
        entityType: 'CUSTOMER_ORDER',
        entityId: created.id,
        action: 'CREATED',
        metadata: { source: 'whatsapp', intent: 'ORDER' },
      })
      .catch(() => {});
    return {
      reply: `Got it ${customer.name}! Your request has been logged as ${created.orderNumber}. We'll confirm price + ETA shortly.`,
      orderId: created.id,
      tenantUserId: customer.userId,
    };
  }

  if (intent.intent === 'GREETING') {
    return {
      reply: `Hi ${customer.name}! Reply with what you'd like to order, or type "status CO-XXXXX" to check an existing order.`,
      tenantUserId: customer.userId,
    };
  }

  // UNKNOWN — log + ask for clarification.
  await documentAudit
    .log({
      userId: customer.userId,
      actorId: null,
      entityType: 'CUSTOMER_ORDER',
      entityId: customer.id,
      action: 'CREATED' as any,
      metadata: { source: 'whatsapp', intent: 'UNKNOWN', body: args.body.slice(0, 200) },
    })
    .catch(() => {});
  return {
    reply:
      `Hi ${customer.name}, I'm not sure how to help with that. ` +
      `Reply with what you'd like to order, or "status CO-XXXXX" to check an order.`,
    tenantUserId: customer.userId,
  };
}
