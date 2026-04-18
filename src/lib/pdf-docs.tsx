/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';

// Keep PDF colours in sync with `tailwind.config.ts`. Receipts/invoices are
// customer-facing, so we lean on the new brand palette (blue chrome, green
// "paid" badge) for visual consistency with the app.
const palette = {
  ink: '#1A1A1A',
  brand: '#00B8E8',       // primary UI blue (headers, accent strokes)
  brandLight: '#E6F8FD',  // soft blue tint (light backgrounds)
  slate600: '#475569',
  slate500: '#64748B',
  slate300: '#CBD5E1',
  slate100: '#F1F5F9',
  success700: '#588A10',  // deep green — matches success-700
  success50:  '#F2FBDC',  // pale green tint
  owed600: '#D97706',
  owed50:  '#FEF3C7',
  border: '#E5E7EB',
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: palette.ink,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: `1px solid ${palette.border}`,
    paddingBottom: 16,
    marginBottom: 16,
  },
  business: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: palette.brand },
  businessSub: { marginTop: 4, fontSize: 9, color: palette.slate500 },
  badge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: palette.brand,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  docNumber: { fontSize: 10, color: palette.brand, fontFamily: 'Helvetica-Bold' },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  kvLabel: { color: palette.slate500, fontSize: 10 },
  kvValue: { color: palette.ink, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  sectionBox: {
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: palette.slate500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    borderBottom: `1px solid ${palette.border}`,
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableCol: { fontSize: 9, color: palette.slate500, fontFamily: 'Helvetica-Bold' },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${palette.slate100}`,
    paddingVertical: 6,
  },
  itemLabel: { flex: 3, fontSize: 10, color: palette.ink },
  itemQty: { flex: 1, fontSize: 10, color: palette.slate600, textAlign: 'center' },
  itemPrice: { flex: 2, fontSize: 10, color: palette.slate600, textAlign: 'right' },
  itemTotal: { flex: 2, fontSize: 10, color: palette.ink, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTop: `1px solid ${palette.border}`,
  },
  totalLabel: { fontSize: 10, color: palette.slate500, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  totalAmount: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: palette.ink },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: `1px solid ${palette.border}`,
    textAlign: 'center',
    fontSize: 8,
    color: palette.slate500,
  },
});

function formatNaira(amount: number): string {
  return 'NGN ' + amount.toLocaleString('en-NG');
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ────────────────── RECEIPT ────────────────── */

export type ReceiptData = {
  business: string;
  businessAddress?: string | null;
  whatsappNumber?: string | null;
  receiptFooter?: string | null;
  receiptId: string;
  customerName: string;
  customerPhone: string;
  createdAt: Date;
  status: 'PAID' | 'PENDING' | string;
  amount: number;
  items: { description: string; unitPrice: number; quantity: number }[];
};

export function ReceiptDoc({ data }: { data: ReceiptData }) {
  const hasItems = data.items.length > 0;
  const itemsTotal = data.items.reduce(
    (s, it) => s + it.unitPrice * it.quantity,
    0,
  );
  const isPaid = data.status === 'PAID';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.business}>{data.business}</Text>
            {data.businessAddress ? (
              <Text style={styles.businessSub}>{data.businessAddress}</Text>
            ) : null}
            {data.whatsappNumber ? (
              <Text style={styles.businessSub}>Tel: {data.whatsappNumber}</Text>
            ) : null}
            <Text style={[styles.eyebrow, { marginTop: 6 }]}>Receipt</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPaid ? palette.success50 : palette.slate100,
                color: isPaid ? palette.success700 : palette.slate600,
              },
            ]}
          >
            <Text>{isPaid ? 'Paid' : data.status}</Text>
          </View>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Name</Text>
            <Text style={styles.kvValue}>{data.customerName}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Phone</Text>
            <Text style={styles.kvValue}>{data.customerPhone}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Date</Text>
            <Text style={styles.kvValue}>{formatDate(data.createdAt)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Receipt #</Text>
            <Text style={styles.kvValue}>
              {data.receiptId.slice(-8).toUpperCase()}
            </Text>
          </View>
        </View>

        {hasItems && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.tableCol, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Price</Text>
              <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Total</Text>
            </View>
            {data.items.map((it, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.itemLabel}>{it.description}</Text>
                <Text style={styles.itemQty}>{it.quantity}</Text>
                <Text style={styles.itemPrice}>{formatNaira(it.unitPrice)}</Text>
                <Text style={styles.itemTotal}>
                  {formatNaira(it.unitPrice * it.quantity)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {hasItems && itemsTotal !== data.amount && (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Items subtotal</Text>
            <Text style={styles.kvValue}>{formatNaira(itemsTotal)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatNaira(data.amount)}</Text>
        </View>

        {data.receiptFooter && (
          <View style={styles.footer}>
            <Text>{data.receiptFooter}</Text>
          </View>
        )}
        <View style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ fontSize: 8, color: palette.slate500 }}>
            Receipt by CashTraka
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/* ────────────────── INVOICE ────────────────── */

export type InvoiceData = {
  business: string;
  businessAddress?: string | null;
  whatsappNumber?: string | null;
  invoiceNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  issuedAt: Date;
  dueDate?: Date | null;
  subtotal: number;
  tax: number;
  total: number;
  note?: string | null;
  items: { description: string; unitPrice: number; quantity: number }[];
  bank?: {
    name?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
  } | null;
};

export function InvoiceDoc({ data }: { data: InvoiceData }) {
  const isPaid = data.status === 'PAID';
  const label =
    isPaid ? 'Paid'
    : data.status === 'CANCELLED' ? 'Cancelled'
    : data.status === 'SENT' ? 'Awaiting payment'
    : 'Draft';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.docNumber}>{data.invoiceNumber}</Text>
            <Text style={[styles.business, { marginTop: 4 }]}>{data.business}</Text>
            {data.businessAddress ? (
              <Text style={styles.businessSub}>{data.businessAddress}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPaid ? palette.success50 : palette.owed50,
                color: isPaid ? palette.success700 : palette.owed600,
              },
            ]}
          >
            <Text>{label}</Text>
          </View>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Bill to</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Name</Text>
            <Text style={styles.kvValue}>{data.customerName}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Phone</Text>
            <Text style={styles.kvValue}>{data.customerPhone}</Text>
          </View>
          {data.customerEmail ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Email</Text>
              <Text style={styles.kvValue}>{data.customerEmail}</Text>
            </View>
          ) : null}
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Issued</Text>
            <Text style={styles.kvValue}>{formatDate(data.issuedAt)}</Text>
          </View>
          {data.dueDate ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Due</Text>
              <Text style={styles.kvValue}>{formatDate(data.dueDate)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCol, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {data.items.map((it, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.itemLabel}>{it.description}</Text>
              <Text style={styles.itemQty}>{it.quantity}</Text>
              <Text style={styles.itemPrice}>{formatNaira(it.unitPrice)}</Text>
              <Text style={styles.itemTotal}>
                {formatNaira(it.unitPrice * it.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Subtotal</Text>
          <Text style={styles.kvValue}>{formatNaira(data.subtotal)}</Text>
        </View>
        {data.tax > 0 && (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Tax / VAT</Text>
            <Text style={styles.kvValue}>{formatNaira(data.tax)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatNaira(data.total)}</Text>
        </View>

        {!isPaid && data.bank && data.bank.name && data.bank.accountNumber && (
          <View
            style={[
              styles.sectionBox,
              { marginTop: 14, backgroundColor: palette.brandLight, borderColor: palette.brandLight },
            ]}
          >
            <Text style={styles.sectionTitle}>Pay to</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Bank</Text>
              <Text style={styles.kvValue}>{data.bank.name}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Account</Text>
              <Text style={styles.kvValue}>{data.bank.accountNumber}</Text>
            </View>
            {data.bank.accountName ? (
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Name</Text>
                <Text style={styles.kvValue}>{data.bank.accountName}</Text>
              </View>
            ) : null}
          </View>
        )}

        {data.note ? (
          <View style={styles.footer}>
            <Text>Note: {data.note}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ fontSize: 8, color: palette.slate500 }}>
            Invoice by CashTraka
          </Text>
        </View>
      </Page>
    </Document>
  );
}
