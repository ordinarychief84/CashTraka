# CashTraka Backend Architecture

Reference guide for engineers touching the server side. Covers the folder
layout, the service-layer convention, the response envelope, the admin area,
receipts, email, file uploads, and how to take this to production on Postgres.

---

## 1. Stack

| Concern         | Choice                           | Why                                              |
|-----------------|----------------------------------|--------------------------------------------------|
| Framework       | Next.js 14 App Router + TS       | Single codebase, full-stack, server components   |
| Auth            | Custom JWT (`jose` + `bcryptjs`) | Simple, audited, already shipped end-to-end      |
| DB (dev)        | SQLite                            | Zero-install local dev                           |
| DB (prod)       | PostgreSQL                       | Standard prod DB; swap provider in schema        |
| ORM             | Prisma                           | Type-safe, migrations, great DX                  |
| Validation      | Zod                              | Runtime-safe + inferred types                    |
| PDF             | `@react-pdf/renderer`            | JSX pipeline, branded receipts/invoices          |
| Email           | Resend (direct HTTP)             | Simple transactional email                       |
| File storage    | Cloudinary                       | Hosted URLs for logos + receipt PDFs             |

**Deviation from spec:** the spec mentions NextAuth + pdf-lib. We ship the
custom JWT + `@react-pdf/renderer` already shipped across dozens of routes and
tested end-to-end; rewriting both would have been regression risk with no
user-facing gain. All other spec items are implemented.

---

## 2. Folder layout

```
src/
  app/
    api/
      auth/            # /login, /signup, /logout
      admin/           # /metrics, /analytics, /users[/id][/suspend|reactivate|notes]
      payments/        # GET list, POST create, GET/PATCH/DELETE [id], POST [id]/verify, POST [id]/payments
      debts/           # GET list, POST create, GET/PATCH/DELETE [id], POST [id]/payments
      customers/       # GET list, GET [id]
      receipts/        # GET [id] (stream PDF), POST generate, POST [id]/send
      settings/        # GET, PATCH, POST; POST logo (multipart)
      onboarding/      # POST mark complete, GET state
      invoices/        # full CRUD + PDF endpoint
      team/, clock/, tasks/, checklists/, reminders/, properties/, tenants/, rent-payments/, fraud-reports/, search/, export/[kind]

    (public)           # landing, login, signup, pricing, etc.
    (authed)           # dashboard, payments, debts, customers, settings, etc.
    admin/             # admin-only UI (protected via src/app/admin/layout.tsx)
    r/[id]/            # public receipt page (no auth needed, unguessable cuid)
    invoice/[number]/  # public invoice page

  lib/
    auth.ts                          # JWT session cookies, password hashing, guards
    prisma.ts                        # Prisma singleton
    api-response.ts                  # { success, data, error } envelope helpers
    errors.ts                        # typed ServiceError classes
    validators.ts                    # Zod schemas
    business-type.ts                 # ICP feature matrix + copy packs
    gate.ts                          # plan quota + feature gates
    whatsapp.ts, format.ts, ref-code.ts, ... (single-file utilities)

    constants/
      roles.ts                       # USER | ADMIN, BUSINESS_TYPES
      receipt-status.ts              # GENERATED | EMAILED | FAILED

    repositories/
      user.repository.ts
      payment.repository.ts
      debt.repository.ts
      customer.repository.ts
      receipt.repository.ts

    services/
      auth.service.ts                # signup, login, logout
      user.service.ts                # settings, logo URL
      payment.service.ts             # create, list, get
      debt.service.ts                # create, list, get, markPaid (triggers receipt)
      customer.service.ts            # list, detail, search (re-exports upsert)
      receipt.service.ts             # generate, streamPdf, streamPdfPublic, sendEmail
      email.service.ts               # Resend wrapper: sendReceipt, sendWelcome
      analytics.service.ts           # system metrics + monthly trends
      admin.service.ts               # user mgmt, suspend/reactivate, notes
      business-type.service.ts       # re-exports business-type.ts

    cloudinary/
      upload.ts                      # uploadLogo, uploadPdf

  components/
    admin/                           # AdminShell, SuspendButton, AddNoteForm
    dashboard/                       # dashboard widgets
    marketing/                       # landing components
    ...

  middleware.ts                      # route protection (login redirect + /admin gate)

prisma/
  schema.prisma                      # source of truth
  seed.ts                            # demo seller + PM + admin

.env                                  # local (SQLite by default)
.env.example                          # template with Resend + Cloudinary
.env.postgres.example                 # production Postgres template
```

---

## 3. Conventions

### 3.1 Route handlers are thin

Every new route handler follows this shape:

```ts
import { requireUser } from '@/lib/auth';
import { paymentService } from '@/lib/services/payment.service';
import { handled, ok } from '@/lib/api-response';

export const POST = (req: Request) =>
  handled(async () => {
    const user = await requireUser();            // auth
    const body = await req.json();               // parse
    const result = await paymentService.create(user.id, body); // business logic lives in service
    return ok(result);                           // envelope
  });
```

Legacy routes still use `NextResponse.json(...)` directly — they're migrated
opportunistically as they're touched.

### 3.2 Response envelope

All new responses use `{ success, data, error }`:

```json
// Success
{ "success": true, "data": { "id": "cmxyz...", "receiptNumber": "CT-00001" } }

// Failure
{ "success": false, "error": "Invalid email or password" }
```

Helpers in `src/lib/api-response.ts`:
- `ok<T>(data, status = 200)`
- `fail(error, status = 400, details?)`
- `unauthorized()`, `forbidden()`, `notFound()` — status-code shortcuts
- `validationFail(zodError)` — returns 422 with issue details
- `handled(async fn)` — catches `ServiceError`, `ZodError`, returns sanitized JSON

### 3.3 Service errors

Services throw typed errors via `@/lib/errors`:

```ts
import { Err } from '@/lib/errors';

if (!user) throw Err.notFound('User not found');
if (duplicate) throw Err.conflict('Email already taken');
if (!allowed) throw Err.forbidden();
```

Route handlers wrap their work in `handled()`, which maps these to correct
HTTP codes (404, 409, 403, etc.) and never leaks stack traces.

### 3.4 Auth guards

| Helper                    | Use case                                                     |
|---------------------------|--------------------------------------------------------------|
| `getCurrentUser()`        | Returns user or `null`. Use in pages for optional auth.     |
| `requireUser()`           | Throws `UNAUTHORIZED` if no user, `FORBIDDEN` if suspended. |
| `requireAdmin()`          | Throws `FORBIDDEN` if user isn't an admin.                  |
| `requireBusinessAccess()` | Enforces ownership: `resource.userId === user.id`.          |

### 3.5 Ownership checks

Routes scope queries by `userId` manually:

```ts
const payment = await prisma.payment.findFirst({
  where: { id: params.id, userId: user.id },  // implicit ownership
});
```

Admins bypass ownership via `requireBusinessAccess()` — which returns early
when `user.role === 'ADMIN'`.

---

## 4. Receipt lifecycle

1. **Create payment** → just a record; no receipt yet.
2. **Verify payment** (bank alert or manual) → `receiptService.ensureForPayment()` fires.
   - Idempotent — if a Receipt for this payment already exists, returns it.
   - Renders PDF via `@react-pdf/renderer` (`ReceiptDoc`).
   - Uploads to Cloudinary if configured (stores `pdfUrl`).
   - Persists `Receipt` row with `status: 'GENERATED'`.
3. **Mark debt PAID** → `debtService.markPaid()` auto-creates a compensating
   `Payment` for the remaining balance and then calls `ensureForPayment()`.
4. **Send email** → `POST /api/receipts/[id]/send` with `{ to: 'customer@example.com' }`
   re-renders the PDF, attaches it as base64, ships via Resend, and flips
   the Receipt to `EMAILED` (or `FAILED` on Resend errors).
5. **Stream PDF** → `GET /api/receipts/[id]` (public) returns the live PDF
   bytes. The `id` can be either a `Receipt.id` or a `Payment.id` (legacy).

### Degradation

The receipt system keeps working with missing env vars:

- No `CLOUDINARY_URL` → Receipts still generate and render on demand; `pdfUrl` is null.
- No `RESEND_API_KEY` → `sendEmail()` returns `{ ok: false, error }`; the
  Receipt is marked `FAILED` and can be retried.

---

## 5. Admin area

### Access

- Seed user: `admin@cashtraka.app` / `admin123` (from `prisma/seed.ts`).
- Admin routes protected at two layers:
  1. Middleware: `/admin` requires a valid session cookie.
  2. Page-level: `src/app/admin/layout.tsx` redirects non-admins to `/dashboard`.
  3. API-level: every `/api/admin/*` handler calls `requireAdmin()` first.

### Pages

| Route                   | Purpose                                                         |
|-------------------------|-----------------------------------------------------------------|
| `/admin/dashboard`      | System-wide KPIs + recent signups/payments/debts                |
| `/admin/users`          | Searchable, filterable, paginated user list                     |
| `/admin/users/[id]`     | User detail + totals + admin notes + suspend/reactivate actions |
| `/admin/analytics`      | Monthly signup & revenue trends                                 |

### API

| Method   | Path                                        | Purpose                  |
|----------|---------------------------------------------|--------------------------|
| GET      | `/api/admin/metrics`                        | Headline KPIs            |
| GET      | `/api/admin/analytics?months=6`             | Monthly trend series     |
| GET      | `/api/admin/users`                          | List w/ filters          |
| GET      | `/api/admin/users/[id]`                     | Detail + notes           |
| PATCH    | `/api/admin/users/[id]/suspend`             | Suspend (body: reason?)  |
| PATCH    | `/api/admin/users/[id]/reactivate`          | Reactivate               |
| POST     | `/api/admin/users/[id]/notes`               | Append an AdminNote      |

Admins cannot suspend themselves or other admins.

---

## 6. Email (Resend)

`email.service.ts` posts directly to `https://api.resend.com/emails`. If
`RESEND_API_KEY` is unset, the function returns `{ ok: false, error }` without
throwing — callers decide how to handle (Receipt flips to FAILED).

### Sending a receipt programmatically

```ts
import { receiptService } from '@/lib/services/receipt.service';

const result = await receiptService.sendEmail(userId, receiptId, 'buyer@mail.com');
if (!result.ok) console.warn(result.error);
```

---

## 7. File uploads (Cloudinary)

Endpoint: `POST /api/settings/logo` (multipart/form-data, field `file`).

Limits: 2 MB, `image/png`, `image/jpeg`, `image/webp`.

`src/lib/cloudinary/upload.ts` is resilient: if Cloudinary env vars are unset,
`uploadLogo()` and `uploadPdf()` return `null` instead of throwing.

Receipt PDFs are uploaded under `cashtraka/receipts/<userId>/CT-00001.pdf`.
Logos under `cashtraka/logos/<userId>`.

---

## 8. Running locally

```bash
# one-time
npm install
cp .env.example .env          # add AUTH_SECRET at minimum
npx prisma db push
npm run db:seed

# day to day
npm run dev                   # http://localhost:3000
```

### Demo accounts

| Email                    | Password      | Role  | Business type  |
|--------------------------|---------------|-------|----------------|
| `demo@cashtraka.app`     | `password123` | USER  | Seller         |
| `admin@cashtraka.app`    | `admin123`    | ADMIN | Seller         |

---

## 9. Deploying to production (Postgres)

1. **Flip the Prisma provider**

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Set env vars** — copy `.env.postgres.example` and fill in real values:
   - `DATABASE_URL` (Postgres)
   - `AUTH_SECRET` (fresh, 32+ bytes)
   - `APP_URL`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `CLOUDINARY_URL` (or CLOUD_NAME + API_KEY + API_SECRET)

3. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```
   On first-ever deploy, instead do:
   ```bash
   npx prisma migrate dev --name initial
   ```
   to snapshot the current schema as the baseline migration.

4. **Seed an admin** — run the seed script (edit `prisma/seed.ts` first if you
   want a different admin email in prod).

5. **Deploy** — Vercel / Railway / Render / Fly.io etc. The app is a standard
   Next.js build; nothing special.

---

## 10. Security notes

- Passwords hashed with bcrypt (10 rounds).
- Session tokens signed with HS256, 30-day expiry, HttpOnly cookies.
- All write endpoints validate body with Zod → structured 422 errors.
- All protected routes ownership-check: either by `userId` scoping in the Prisma
  query or via `requireBusinessAccess(resource, user)`.
- Suspended users: blocked at login (`authService.login`) and at runtime
  (`requireUser()` throws FORBIDDEN).
- Admin endpoints check role via `requireAdmin()`.
- Errors never leak internals — `handled()` sanitizes unknown exceptions.
