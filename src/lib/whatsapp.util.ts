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
