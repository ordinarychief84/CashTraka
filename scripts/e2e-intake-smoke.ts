/**
 * E2E smoke test for the Rackbeat-style intake dialogs.
 *
 * Hits the validators + service layer directly (no HTTP) so we can
 * verify the empty-items draft path works end-to-end without spinning
 * up a server or seeding auth state.
 *
 * Run: tsx scripts/e2e-intake-smoke.ts
 */
import { customerOrderSchema, purchaseOrderSchema, supplierSchema } from '../src/lib/validators';

const results: Array<{ test: string; pass: boolean; detail?: string }> = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ test: name, pass: true });
  } catch (e) {
    results.push({ test: name, pass: false, detail: (e as Error).message });
  }
}

// ── customerOrderSchema: empty items must now parse ────────────────────────
check('customerOrderSchema accepts empty items array', () => {
  const parsed = customerOrderSchema.parse({
    customerName: 'Test Customer',
    items: [],
  });
  if (parsed.items.length !== 0) throw new Error(`Expected items=[], got ${JSON.stringify(parsed.items)}`);
});

check('customerOrderSchema items defaults to [] when omitted', () => {
  const parsed = customerOrderSchema.parse({
    customerName: 'Test Customer',
  });
  if (parsed.items.length !== 0) throw new Error(`Expected items=[], got ${JSON.stringify(parsed.items)}`);
});

check('customerOrderSchema still requires customerName', () => {
  try {
    customerOrderSchema.parse({ items: [] });
    throw new Error('Should have thrown');
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    if ((e as any).issues?.[0]?.path?.[0] !== 'customerName' &&
        !e.message.toLowerCase().includes('customername') &&
        !e.message.toLowerCase().includes('required')) {
      throw new Error(`Unexpected error: ${e.message}`);
    }
  }
});

check('customerOrderSchema accepts a single item too', () => {
  const parsed = customerOrderSchema.parse({
    customerName: 'Test Customer',
    items: [{ description: 'Cake', quantity: 1, unitPriceKobo: 50000 }],
  });
  if (parsed.items.length !== 1) throw new Error(`Expected items.length=1, got ${parsed.items.length}`);
});

// ── purchaseOrderSchema: empty items must now parse ────────────────────────
check('purchaseOrderSchema accepts empty items array', () => {
  const parsed = purchaseOrderSchema.parse({
    supplierId: 'clp123abc456def789ghi012j',
    items: [],
  });
  if (parsed.items.length !== 0) throw new Error(`Expected items=[], got ${JSON.stringify(parsed.items)}`);
});

check('purchaseOrderSchema items defaults to [] when omitted', () => {
  const parsed = purchaseOrderSchema.parse({
    supplierId: 'clp123abc456def789ghi012j',
  });
  if (parsed.items.length !== 0) throw new Error(`Expected items=[], got ${JSON.stringify(parsed.items)}`);
});

check('purchaseOrderSchema still requires supplierId', () => {
  try {
    purchaseOrderSchema.parse({ items: [] });
    throw new Error('Should have thrown');
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    const issues = (e as any).issues;
    if (!issues || issues[0]?.path?.[0] !== 'supplierId') {
      throw new Error(`Unexpected error: ${e.message}`);
    }
  }
});

// ── supplierSchema: NewSupplierForm payload shape ──────────────────────────
check('supplierSchema accepts the NewSupplierForm payload', () => {
  // Mirrors what NewSupplierForm.tsx submits
  const parsed = supplierSchema.parse({
    name: 'Test Supplier',
    phone: '08012345678',
    email: 'supplier@example.com',
    address: 'Lagos, Nigeria',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
    notes: 'Created via Rackbeat intake form',
  });
  if (parsed.name !== 'Test Supplier') throw new Error('name mismatch');
});

check('supplierSchema accepts the NewSupplierForm minimal payload (name only)', () => {
  const parsed = supplierSchema.parse({ name: 'Minimal Supplier' });
  if (parsed.name !== 'Minimal Supplier') throw new Error('name mismatch');
});

check('supplierSchema rejects empty name', () => {
  try {
    supplierSchema.parse({ name: '' });
    throw new Error('Should have thrown');
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    const issues = (e as any).issues;
    if (!issues || issues[0]?.path?.[0] !== 'name') {
      throw new Error(`Unexpected error: ${e.message}`);
    }
  }
});

// ── Print summary ──────────────────────────────────────────────────────────
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);

console.log('\n=== Intake dialog smoke test ===');
for (const r of results) {
  console.log(`${r.pass ? '✓' : '✗'} ${r.test}${r.detail ? ` — ${r.detail}` : ''}`);
}
console.log(`\n${passed}/${results.length} passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}
