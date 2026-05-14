# Co-packer flow — design doc

**Status:** design only. **Not implemented.** Author: PR-K series, May 2026.

Why this is a doc, not code: a cross-tenant data model is a security
surface. Getting it wrong leaks customer lists, recipes, or production
schedules across businesses. Shipping the schema before the design is
reviewed is reckless.

---

## Problem

Many Nigerian small-batch businesses don't own production capacity.
A skincare brand outsources blending + filling to a contract
manufacturer. A snack brand rents kitchen time at a co-packer. Today
that workflow lives in WhatsApp + paper invoices. CashTraka can
become the operational system of record for *both sides*: the brand
(client) and the co-packer (producer).

### Two personas, one schema

| Persona | Action | Reads | Writes |
|---|---|---|---|
| Brand (client) | Sends a production request to a co-packer | Their own catalog + the linked co-packer's quote | A `CoPackOrder` to the co-packer's tenant |
| Co-packer (producer) | Accepts/rejects, schedules, produces, ships | Their own materials + recipe defined by the brand | A `ProductionOrder` against their own materials |

The simplest mental model: a `CoPackOrder` is a CustomerOrder on the
co-packer's tenant whose customer is **another tenant**, not a
consumer. Most CashTraka primitives (recipes, materials, production,
invoicing) work unchanged.

---

## Non-goals

- Multi-tenant *recipe* sharing where the brand's IP travels into the
  co-packer's account. Brands keep recipes private; the co-packer
  proposes their own (or uses a shared blind one).
- Marketplace / discovery. Two tenants pair off via an explicit
  invitation; we don't run a directory.
- Settlement / escrow / payment splitting. Payment between brand and
  co-packer happens via Paystack the same way two parties do today;
  CashTraka tracks invoice + receipt but does not hold funds.

---

## Schema sketch

Two new models. **Both** preserve owner-scoped tenancy (every row
still has a `userId` that owns it).

```prisma
model CoPackerLink {
  id              String   @id @default(cuid())
  /// Brand-side tenant.
  brandUserId     String
  /// Co-packer tenant.
  packerUserId    String
  /// "pending" | "active" | "revoked"
  status          String   @default("pending")
  /// Brand-set display name for this co-packer in their UI.
  brandLabel      String?
  /// Co-packer-set display name for this brand.
  packerLabel     String?
  /// Permissions matrix — JSON of booleans:
  ///   readPackerInventory     can the brand see packer's material stock?
  ///   shareBrandRecipe        does the brand expose the recipe to the packer?
  ///   autoChargeOnReceive     auto-issue brand-to-packer invoice on receive?
  permsJson       String   @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  brandUser  User @relation("CoPackerLinkBrand",  fields: [brandUserId],  references: [id], onDelete: Cascade)
  packerUser User @relation("CoPackerLinkPacker", fields: [packerUserId], references: [id], onDelete: Cascade)

  @@unique([brandUserId, packerUserId])
  @@index([brandUserId])
  @@index([packerUserId])
}

model CoPackOrder {
  id              String   @id @default(cuid())
  /// Brand-side production request.
  brandUserId     String
  /// Co-packer's tenant.
  packerUserId    String
  /// Brand-side identifier shown to the brand: "CP-BRAND-0001".
  brandRef        String   @unique
  /// Co-packer's CustomerOrder that materialises on accept.
  packerCustomerOrderId String? @unique
  /// "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "IN_PRODUCTION" |
  /// "READY" | "SHIPPED" | "RECEIVED" | "INVOICED" | "PAID" | "CANCELLED"
  status          String   @default("DRAFT")
  /// JSON-encoded items at submission time.
  itemsJson       String
  /// Brand's target ship-by date.
  shipByAt        DateTime?
  /// Once the packer accepts: estimated cost in kobo for the brand.
  quotedTotalKobo Int?
  notes           String?
  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  brandUser  User @relation("CoPackOrderBrand",  fields: [brandUserId],  references: [id], onDelete: Restrict)
  packerUser User @relation("CoPackOrderPacker", fields: [packerUserId], references: [id], onDelete: Restrict)

  @@index([brandUserId, status, createdAt])
  @@index([packerUserId, status, createdAt])
}
```

Key choices:

1. **No shared recipes.** Recipe lives on the packer side (the packer
   defines what they need to make the brand's product). Brands who
   want IP protection use a shared blind recipe described in `notes`
   and tracked off-system.
2. **`onDelete: Restrict`** on `CoPackOrder.brandUser` + `packerUser` —
   neither side can hard-delete an account that still has live
   co-pack history. This matters for FIRS / dispute resolution.
3. **Permission matrix is JSON-encoded** on `CoPackerLink.permsJson` so
   adding a new permission later doesn't require a migration.

---

## Auth: how do brand A and packer B talk?

`requireAuth()` currently scopes everything by `ctx.owner.id`. A
co-packer route that lets brand A read packer B's data must go
through an explicit gate:

```ts
async function requireCoPackerAccess(
  fromUserId: string,
  toUserId: string,
  permission: 'readPackerInventory' | 'shareBrandRecipe' | ...,
): Promise<CoPackerLink> {
  const link = await prisma.coPackerLink.findFirst({
    where: {
      brandUserId: fromUserId,
      packerUserId: toUserId,
      status: 'active',
    },
  });
  if (!link) throw Err.forbidden();
  const perms = JSON.parse(link.permsJson || '{}');
  if (!perms[permission]) throw Err.forbidden(`No permission: ${permission}`);
  return link;
}
```

Every cross-tenant query in services passes through this gate
before touching another tenant's data. Inline ownership checks
(the existing `findFirst({where:{id, userId}})` pattern) still apply
for *same-tenant* data; the new gate handles only the cross-tenant
case.

---

## Lifecycle

```
Brand                                Co-packer
─────                                ─────────
DRAFT  ──draft a request──>   (invisible)
        ──send──>                    SENT
                                     │
                                     │ accept ──> ACCEPTED + quote
                                     │ reject ──> REJECTED   (terminal)
                                     │
                                     │ start prod ──> IN_PRODUCTION
                                     │
                                     │ complete ──> READY
                                     │
                                     │ ship     ──> SHIPPED
        receive   <──ship notice──   │
RECEIVED  ──ack──>                   │
                                     │ generates invoice on the brand
INVOICED  <─────── invoice ───────   │
        ── Paystack ──>              │
                                     │
PAID  (both sides flip)
```

Each transition fires a `DocumentAuditLog` on both tenants with the
same `correlationId` so audits join across the two sides cleanly.

---

## Open questions / risks

1. **Quote negotiation.** Packer's quote can be rejected by the brand
   ("too expensive"). Do we model that as a `RFQ` round-trip or just
   let them cancel + redraft? Probably the latter for v1.
2. **Material ownership.** When the brand supplies raw materials to
   the packer ("send the labels yourself"), who owns the stock row?
   v1: packer's, with a `CoPackOrder.brandSuppliedMaterialIds` field
   to flag.
3. **Pricing visibility.** Does the brand see the packer's actual
   material cost? Default no — the packer quotes a number. Permission
   to expose cost lives on the permsJson matrix.
4. **Returns / quality rejects.** If the brand rejects a shipment,
   what happens to the StockMovement on the packer? v1: out-of-scope;
   handled manually with a free-text note.
5. **Tax invoicing.** A co-packer issues a tax invoice to the brand;
   the brand sells the finished good to the consumer with their own
   tax invoice. Two invoices per unit. FIRS adapter must handle both
   correctly; v1 of co-packer flow does NOT auto-submit either to FIRS.

---

## Effort estimate

- **Schema + migration**: 2 days
- **Auth gate + service layer**: 4 days
- **Brand-side UI** (request, send, receive): 5 days
- **Packer-side UI** (inbox, accept, schedule, complete, ship): 6 days
- **Invoice round-trip + email/WhatsApp templates**: 3 days
- **End-to-end testing across two real tenants**: 3 days
- **Security review of cross-tenant queries**: 2 days

≈ **5 engineer-weeks**. Won't be shipped this session.

---

## Recommended next step

Walk the doc with a real co-packer + brand pair (the Nigerian
community has plenty — Tarmac, Vintage Beauty, Lush by Tola).
Validate the lifecycle, especially material ownership + quote
negotiation. Iterate the doc, then build. Don't start the code from
this draft alone.
