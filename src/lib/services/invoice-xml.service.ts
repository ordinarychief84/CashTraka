/**
 * Internal XML serializer for invoices and credit notes.
 *
 * This produces a stable, self-describing CashTraka XML format. The real
 * FIRS Merchant Buyer Solution wire-format is intentionally NOT shipped
 * here — the FIRSInvoicePayload type in firs-invoice.service.ts is the
 * boundary, and the real XML/JSON shape will be added when the FIRS
 * adapter is implemented.
 *
 * This file's job is:
 *   1. Produce an archivable XML representation we can drop in
 *      DocumentArchive.xmlUrl.
 *   2. Round-trip cleanly: every field in the database that affects the
 *      legal document appears in the XML.
 *   3. Be safe to ship to disk / object storage today, even before any
 *      FIRS work is done.
 */

import type { Invoice, InvoiceItem, CreditNote, User } from '@prisma/client';

const xmlEscape = (v: string | number | null | undefined): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const tag = (
  name: string,
  value: string | number | null | undefined,
  emptyOk = false,
): string =>
  value === null || value === undefined || value === '' && !emptyOk
    ? ''
    : `<${name}>${xmlEscape(value)}</${name}>`;

type SellerSnapshot = Pick<
  User,
  | 'businessName'
  | 'name'
  | 'businessAddress'
  | 'tin'
  | 'whatsappNumber'
  | 'bankName'
  | 'bankAccountNumber'
  | 'bankAccountName'
>;

export const invoiceXmlService = {
  /**
   * Serialize an invoice (with items + seller) into our internal XML.
   * Returns a UTF-8 string with an XML prolog, ready to be uploaded.
   */
  invoiceToXml(args: {
    invoice: Invoice & { items: InvoiceItem[] };
    seller: SellerSnapshot;
  }): string {
    const { invoice, seller } = args;

    const items = invoice.items
      .map((it) => {
        const lineTotal = it.unitPrice * it.quantity;
        return `      <Item>
        ${tag('Description', it.description)}
        ${tag('ItemType', it.itemType)}
        ${tag('HSCode', it.hsCode)}
        ${tag('UnitPrice', it.unitPrice)}
        ${tag('Quantity', it.quantity)}
        ${tag('VATExempt', it.vatExempt ? 'true' : 'false')}
        ${tag('LineTotal', lineTotal)}
      </Item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="https://cashtraka.co/schemas/invoice/v1">
  <Header>
    ${tag('InvoiceNumber', invoice.invoiceNumber)}
    ${tag('Status', invoice.status)}
    ${tag('Currency', invoice.currency)}
    ${tag('IssuedAt', invoice.issuedAt.toISOString())}
    ${tag('DueDate', invoice.dueDate ? invoice.dueDate.toISOString() : null)}
    ${tag('PaymentTerms', invoice.paymentTerms)}
  </Header>
  <Seller>
    ${tag('BusinessName', seller.businessName ?? seller.name ?? '')}
    ${tag('Address', seller.businessAddress)}
    ${tag('TIN', seller.tin)}
    ${tag('WhatsApp', seller.whatsappNumber)}
    <Bank>
      ${tag('Name', seller.bankName)}
      ${tag('AccountNumber', seller.bankAccountNumber)}
      ${tag('AccountName', seller.bankAccountName)}
    </Bank>
  </Seller>
  <Buyer>
    ${tag('Name', invoice.customerName)}
    ${tag('Phone', invoice.customerPhone)}
    ${tag('Email', invoice.customerEmail)}
    ${tag('TIN', invoice.buyerTin)}
    ${tag('Address', invoice.buyerAddress)}
  </Buyer>
  <Items>
${items}
  </Items>
  <Totals>
    ${tag('Subtotal', invoice.subtotal)}
    ${tag('Discount', invoice.discount)}
    ${tag('VATApplied', invoice.vatApplied ? 'true' : 'false')}
    ${tag('VATRate', invoice.vatRate)}
    ${tag('Tax', invoice.tax)}
    ${tag('Total', invoice.total)}
    ${tag('AmountPaid', invoice.amountPaid)}
  </Totals>
  ${
    invoice.firsIrn || invoice.firsStatus
      ? `<FIRS>
    ${tag('Status', invoice.firsStatus)}
    ${tag('IRN', invoice.firsIrn)}
    ${tag('SubmittedAt', invoice.firsSubmittedAt ? invoice.firsSubmittedAt.toISOString() : null)}
    ${tag('AcceptedAt', invoice.firsAcceptedAt ? invoice.firsAcceptedAt.toISOString() : null)}
  </FIRS>`
      : ''
  }
  ${invoice.note ? `<Note>${xmlEscape(invoice.note)}</Note>` : ''}
</Invoice>
`;
  },

  /**
   * Credit-note XML — much smaller because it's always derivative of an
   * existing invoice.
   */
  creditNoteToXml(args: { creditNote: CreditNote; invoiceNumber: string }): string {
    const { creditNote, invoiceNumber } = args;
    return `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="https://cashtraka.co/schemas/credit-note/v1">
  ${tag('CreditNoteNumber', creditNote.creditNoteNumber)}
  ${tag('SourceInvoice', invoiceNumber)}
  ${tag('Reason', creditNote.reason)}
  ${tag('Subtotal', creditNote.subtotal)}
  ${tag('Tax', creditNote.taxAmount)}
  ${tag('Total', creditNote.total)}
  ${tag('CreatedAt', creditNote.createdAt.toISOString())}
</CreditNote>
`;
  },
};
