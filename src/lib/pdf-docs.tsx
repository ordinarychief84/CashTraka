/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  View,
  Text,
  Image,
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
  /// Optional human-readable receipt number (e.g., CT-00042). Falls back to last-8 of receiptId.
  receiptNumber?: string | null;
  customerName: string;
  customerPhone: string;
  createdAt: Date;
  status: 'PAID' | 'PENDING' | string;
  amount: number;
  /// When > 0, the receipt represents a partial payment and the PDF will
  /// render "Amount Paid" + "Balance Remaining" rows.
  balanceRemaining?: number | null;
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
              {data.receiptNumber ?? data.receiptId.slice(-8).toUpperCase()}
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
        {data.balanceRemaining && data.balanceRemaining > 0 ? (
          <>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Amount paid</Text>
              <Text style={styles.kvValue}>{formatNaira(data.amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: palette.owed600 }]}>
                Balance remaining
              </Text>
              <Text style={[styles.totalAmount, { color: palette.owed600 }]}>
                {formatNaira(data.balanceRemaining)}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatNaira(data.amount)}</Text>
          </View>
        )}

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
  /// Seller TIN — printed on every tax invoice once the business is VAT-registered.
  tin?: string | null;
  invoiceNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  /// Buyer TIN (mandatory on B2B tax invoices).
  buyerTin?: string | null;
  /// Buyer billing address.
  buyerAddress?: string | null;
  issuedAt: Date;
  dueDate?: Date | null;
  /// Currency code (default NGN).
  currency?: string | null;
  subtotal: number;
  /// VAT amount in the invoice currency.
  tax: number;
  /// VAT rate in percent (e.g. 7.5). When 0, the VAT line is hidden.
  vatRate?: number | null;
  total: number;
  note?: string | null;
  items: {
    description: string;
    unitPrice: number;
    quantity: number;
    itemType?: 'GOODS' | 'SERVICE';
    hsCode?: string | null;
    vatExempt?: boolean;
  }[];
  bank?: {
    name?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
  } | null;
  /// FIRS Invoice Reference Number (returned by FIRS MBS on successful submission).
  firsIrn?: string | null;
  /// Pre-rendered QR code as a base64 PNG data URL ("data:image/png;base64,...").
  /// Generated from `firsQrPayload` at PDF render time using `qrcode`.
  firsQrDataUrl?: string | null;
};

export function InvoiceDoc({ data }: { data: InvoiceData }) {
  const isPaid = data.status === 'PAID';
  const label =
    isPaid ? 'Paid'
    : data.status === 'CANCELLED' ? 'Cancelled'
    : data.status === 'SENT' ? 'Awaiting payment'
    : 'Draft';

  // Tax-invoice mode: when seller has a TIN, this is a formal Nigerian tax
  // invoice. We surface the TIN in the header and label it accordingly.
  const isTaxInvoice = !!data.tin;
  const currency = data.currency || 'NGN';
  const showVatLine = data.tax > 0 || (data.vatRate ?? 0) > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.brand }]}>
              {isTaxInvoice ? 'Tax Invoice' : 'Invoice'}
            </Text>
            <Text style={[styles.docNumber, { marginTop: 2 }]}>{data.invoiceNumber}</Text>
            <Text style={[styles.business, { marginTop: 4 }]}>{data.business}</Text>
            {data.businessAddress ? (
              <Text style={styles.businessSub}>{data.businessAddress}</Text>
            ) : null}
            {data.tin ? (
              <Text style={[styles.businessSub, { fontFamily: 'Helvetica-Bold', color: palette.ink }]}>
                TIN: {data.tin}
              </Text>
            ) : null}
            {data.whatsappNumber ? (
              <Text style={styles.businessSub}>Tel: {data.whatsappNumber}</Text>
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
          {data.buyerTin ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Buyer TIN</Text>
              <Text style={styles.kvValue}>{data.buyerTin}</Text>
            </View>
          ) : null}
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
          {data.buyerAddress ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Address</Text>
              <Text style={styles.kvValue}>{data.buyerAddress}</Text>
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
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Currency</Text>
            <Text style={styles.kvValue}>{currency}</Text>
          </View>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.tableCol, { flex: 4 }]}>Description</Text>
            <Text style={[styles.tableCol, { flex: 1.5 }]}>HS / Type</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.tableCol, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {data.items.map((it, i) => {
            const typeLabel =
              it.itemType === 'SERVICE' ? 'Service' :
              it.hsCode ? it.hsCode :
              'Goods';
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.itemLabel, { flex: 4 }]}>
                  {it.description}
                  {it.vatExempt ? ' (VAT-exempt)' : ''}
                </Text>
                <Text style={[styles.itemQty, { flex: 1.5, textAlign: 'left', color: palette.slate500, fontSize: 9 }]}>
                  {typeLabel}
                </Text>
                <Text style={[styles.itemQty, { flex: 1 }]}>{it.quantity}</Text>
                <Text style={[styles.itemPrice, { flex: 2 }]}>{formatNaira(it.unitPrice)}</Text>
                <Text style={[styles.itemTotal, { flex: 2 }]}>
                  {formatNaira(it.unitPrice * it.quantity)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Subtotal</Text>
          <Text style={styles.kvValue}>{formatNaira(data.subtotal)}</Text>
        </View>
        {showVatLine && (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>
              VAT{data.vatRate ? ` (${data.vatRate}%)` : ''}
            </Text>
            <Text style={styles.kvValue}>{formatNaira(data.tax)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatNaira(data.total)}</Text>
        </View>

        {/* FIRS compliance block — only shown once the invoice has been
            transmitted to FIRS and an IRN has been issued. */}
        {data.firsIrn ? (
          <View
            style={[
              styles.sectionBox,
              { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
            ]}
          >
            {data.firsQrDataUrl ? (
              <Image src={data.firsQrDataUrl} style={{ width: 90, height: 90 }} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>FIRS e-Invoice</Text>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>IRN</Text>
                <Text style={[styles.kvValue, { fontFamily: 'Helvetica' }]}>
                  {data.firsIrn}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: palette.slate500, marginTop: 4 }}>
                This invoice has been transmitted to the Federal Inland Revenue Service
                under the Merchant Buyer Solution. Scan the QR code to verify.
              </Text>
            </View>
          </View>
        ) : null}

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
            {isTaxInvoice
              ? 'Tax invoice issued under Nigerian tax law · Generated by CashTraka'
              : 'Invoice by CashTraka'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
