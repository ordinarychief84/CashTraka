/**
 * WhatsApp Deep-Link Utility — CashTraka
 *
 * Centralized builder for WhatsApp `wa.me` links used across the app:
 * PayLinks, debt reminders, follow-ups, and custom messages.
 *
 * All phone normalisation lives here so the rest of the codebase can pass
 * raw Nigerian numbers (0801…, +234801…, 234801…) and get correct links.
 */

// ── Phone normalisation ──────────────────────────────────────────────

export function normalizeNigerianPhone(raw: string): string {
  let phone = raw.replace(/[\s\-()]/g, '');
  if (phone.startsWith('0')) phone = '234' + phone.slice(1);
  if (phone.startsWith('+')) phone = phone.slice(1);
  return phone;
}

// ── Message templates ────────────────────────────────────────────────

export type ReminderTone = 'gentle' | 'firm' | 'final';

const TONE_TEMPLATES: Record<ReminderTone, (args: {
  customerName: string;
  amount: string;
  description?: string;
  payUrl?: string;
  businessName: string;
}) => string> = {
  gentle: ({ customerName, amount, description, payUrl, businessName }) =>
    `Hi ${customerName},\n\n` +
    `Just a friendly reminder — you have an outstanding balance of ₦${amount}` +
    (description ? ` for ${description}` : '') + '.\n' +
    (payUrl ? `\nPay here: ${payUrl}\n` : '') +
    `\nNo rush, just keeping you in the loop.\n\n— ${businessName}`,

  firm: ({ customerName, amount, description, payUrl, businessName }) =>
    `Hi ${customerName},\n\n` +
    `This is a reminder that ₦${amount} is still outstanding` +
    (description ? ` for ${description}` : '') + '.\n' +
    `Please arrange payment at your earliest convenience.\n` +
    (payUrl ? `\nPay here: ${payUrl}\n` : '') +
    `\n— ${businessName}`,

  final: ({ customerName, amount, description, payUrl, businessName }) =>
    `Dear ${customerName},\n\n` +
    `FINAL NOTICE: Your outstanding balance of ₦${amount}` +
    (description ? ` for ${description}` : '') +
    ' requires immediate attention.\n' +
    `Please settle this today to avoid further action.\n` +
    (payUrl ? `\nPay here: ${payUrl}\n` : '') +
    `\n— ${businessName}`,
};

// ── Link builders ────────────────────────────────────────────────────

export function whatsappLink(phone: string, message: string): string {
  const normalized = normalizeNigerianPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function paymentReminderLink(args: {
  phone: string;
  customerName: string;
  amount: number;
  tone?: ReminderTone;
  description?: string;
  payUrl?: string;
  businessName?: string;
}): string {
  const tone = args.tone || 'gentle';
  const amountStr = args.amount.toLocaleString('en-NG');
  const biz = args.businessName || 'CashTraka';
  const msg = TONE_TEMPLATES[tone]({
    customerName: args.customerName,
    amount: amountStr,
    description: args.description,
    payUrl: args.payUrl,
    businessName: biz,
  });
  return whatsappLink(args.phone, msg);
}

export function paylinkShareMessage(args: {
  customerName: string;
  amount: number;
  payUrl: string;
  description?: string;
  businessName?: string;
}): string {
  const biz = args.businessName || 'CashTraka';
  const desc = args.description ? `\nFor: ${args.description}` : '';
  return (
    `Hi ${args.customerName},\n\n` +
    `You have a payment request of ₦${args.amount.toLocaleString('en-NG')} from ${biz}.${desc}\n\n` +
    `Pay here: ${args.payUrl}\n\n` +
    `— Sent via CashTraka`
  );
}

export function paylinkWhatsappLink(args: {
  phone: string;
  customerName: string;
  amount: number;
  token: string;
  description?: string;
  businessName?: string;
}): string {
  const appUrl = process.env.APP_URL || 'https://cashtraka.co';
  const payUrl = `${appUrl}/pay/${args.token}`;
  const msg = paylinkShareMessage({
    customerName: args.customerName,
    amount: args.amount,
    payUrl,
    description: args.description,
    businessName: args.businessName,
  });
  return whatsappLink(args.phone, msg);
}

// ── Operational planning templates ───────────────────────────────────

/**
 * Build a wa.me link to send a purchase order to a supplier. The message
 * lists the requested materials and total so the supplier can confirm
 * directly in WhatsApp; if the PO has a PDF, it's linked too.
 */
export function lowStockSupplierPingLink(args: {
  phone: string;
  supplierName: string;
  businessName: string;
  poNumber: string;
  items: { materialName: string; unit: string; quantity: number }[];
  totalKobo: number;
  pdfUrl?: string | null;
  expectedAt?: Date | string | null;
}): string {
  const lines = args.items
    .map((it) => `• ${it.quantity} ${it.unit} ${it.materialName}`)
    .join('\n');
  const total = '₦' + Math.round(args.totalKobo / 100).toLocaleString('en-NG');
  const dueLine = args.expectedAt
    ? `\nNeeded by: ${new Date(args.expectedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}`
    : '';
  const pdfLine = args.pdfUrl ? `\nSigned copy: ${args.pdfUrl}` : '';
  const msg =
    `Hi ${args.supplierName},\n\n` +
    `${args.businessName} would like to place purchase order ${args.poNumber}:\n` +
    `${lines}\n\n` +
    `Total: ${total}${dueLine}${pdfLine}\n\n` +
    `Please confirm availability. Thanks!\n— Sent via CashTraka`;
  return whatsappLink(args.phone, msg);
}

/**
 * Customer-facing confirmation that an order has been received and is
 * being scheduled / produced. Reused on CustomerOrder status=CONFIRMED.
 */
export function customerOrderConfirmationLink(args: {
  phone: string;
  customerName: string;
  orderNumber: string;
  businessName: string;
  totalKobo?: number;
  dueAt?: Date | string | null;
  items?: { description: string; quantity: number }[];
}): string {
  const lines = args.items?.length
    ? '\n' + args.items.map((it) => `• ${it.quantity} × ${it.description}`).join('\n')
    : '';
  const total =
    args.totalKobo != null
      ? `\nTotal: ₦${Math.round(args.totalKobo / 100).toLocaleString('en-NG')}`
      : '';
  const due = args.dueAt
    ? `\nExpected by: ${new Date(args.dueAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}`
    : '';
  const msg =
    `Hi ${args.customerName},\n\n` +
    `Thanks for your order with ${args.businessName}! ${args.orderNumber} is confirmed.${lines}${total}${due}\n\n` +
    `We'll keep you posted as we work on it.\n\n— ${args.businessName}`;
  return whatsappLink(args.phone, msg);
}

/**
 * Customer-facing "your order is ready" message. Reused on CustomerOrder
 * status transitions to READY (which fires when its ProductionOrder
 * completes, or on a manual mark-ready action).
 */
export function productionCompletedLink(args: {
  phone: string;
  customerName: string;
  orderNumber: string;
  businessName: string;
  pickupNote?: string;
}): string {
  const note = args.pickupNote ? `\n${args.pickupNote}\n` : '';
  const msg =
    `Hi ${args.customerName},\n\n` +
    `Good news — your order ${args.orderNumber} is ready! 🎉\n${note}` +
    `Reach out if you have any questions.\n\n— ${args.businessName}`;
  return whatsappLink(args.phone, msg);
}

/**
 * Re-order nudge for a returning customer who hasn't ordered in a while.
 * Mirrors back the items from their last order so they can reply "yes
 * please, same as last time" without having to remember what they got.
 *
 * Repeat customers are the cheapest growth lever; one WhatsApp nudge with
 * the last order pre-quoted converts much better than a generic "we
 * miss you" message.
 */
export function customerReorderNudgeLink(args: {
  phone: string;
  customerName: string;
  businessName: string;
  daysSinceLastOrder: number;
  lastOrderItems?: { description: string; quantity: number }[];
  lastOrderNumber?: string;
}): string {
  const summary = args.lastOrderItems?.length
    ? '\n\nLast time you ordered:\n' +
      args.lastOrderItems
        .slice(0, 6)
        .map((it) => `• ${it.quantity} × ${it.description}`)
        .join('\n')
    : '';
  const ref = args.lastOrderNumber ? ` (ref ${args.lastOrderNumber})` : '';
  const msg =
    `Hi ${args.customerName} 👋\n\n` +
    `It's been ${args.daysSinceLastOrder} days since you last ordered from ${args.businessName}${ref}. ` +
    `We'd love to hear from you again.${summary}\n\n` +
    `Just reply with what you'd like and we'll prep it for you.\n\n— ${args.businessName}`;
  return whatsappLink(args.phone, msg);
}
