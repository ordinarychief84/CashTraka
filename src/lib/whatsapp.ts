// Normalize a Nigerian phone number for wa.me links.
// Accepts: 08012345678, +2348012345678, 2348012345678, 8012345678

export function normalizeNigerianPhone(raw: string): string {
  const digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
  if (digits.length === 10) return '234' + digits;
  return digits;
}

export function waLink(phone: string, message: string): string {
  const normalized = normalizeNigerianPhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function reminderMessage(name: string, amount: number): string {
  const formatted = '₦' + amount.toLocaleString('en-NG');
  return `Hi ${name}, you have an outstanding balance of ${formatted}. Kindly complete your payment. Thank you.`;
}

export function followUpMessage(name: string): string {
  return `Hi ${name}, we have new stock available. Let me know if you'd like to order.`;
}

export function displayPhone(phone: string): string {
  const n = normalizeNigerianPhone(phone);
  if (n.startsWith('234') && n.length === 13) {
    return '+234 ' + n.slice(3, 6) + ' ' + n.slice(6, 9) + ' ' + n.slice(9);
  }
  return phone;
}
