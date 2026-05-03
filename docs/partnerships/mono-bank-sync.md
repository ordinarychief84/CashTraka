# Mono partnership: Bank account linking and transaction sync for CashTraka Tax+

## TL;DR

CashTraka (cashtraka.co) is a Nigerian SMB SaaS for receipts, invoices, debt tracking, and FIRS-compliant tax invoices. We just shipped Tax+, a ₦25,000/month tier for VAT-registered businesses doing ₦5M to ₦100M annual revenue. Bank statement sync is one of the five features that justifies the price, and we want to build it on Mono Connect.

We are asking for a commercial agreement covering Connect, Accounts, Transactions, and webhooks, with sandbox and production access. We expect 100 connected accounts in month 1, 500 by month 6, and we want to be in development in 4 weeks and production in 8 weeks. A single named contact on your side and a price quote per connected account is all we need to get moving.

## Subject line

CashTraka x Mono: bank sync partnership for Nigerian SMBs on Tax+ tier

## Who we are

CashTraka is a Nigerian SMB invoicing and FIRS-compliant tax tool with paying users today. We run on Next.js with Postgres on Neon, deployed on Vercel. The team is founder-led, small, and shipping weekly.

## What we are building

We are launching Tax+, a ₦25,000/month tier for VAT-registered businesses (₦5M to ₦100M annual revenue). Full strategy is in `docs/tax-plus-tier.md`. One of the five paid features is automatic bank reconciliation: the seller links their business bank account, and we ingest credits and debits daily and match each one to an existing invoice or expense by amount, date, reference, and sender name. Auto-confirmed matches mark the invoice paid; ambiguous ones go to a "Needs review" queue with three ranked suggestions. This replaces the current "paste your bank SMS alert" flow that our users complain about every week.

## Why we are reaching out

We want Mono Connect as the link layer so our customers can connect their bank accounts in CashTraka and have us read transactions on a daily cadence. Mono is the most reliable account-linking provider in Nigeria, and your existing customer base of fintech and SMB tools overlaps heavily with ours. We would rather build on Mono than try to roll our own bank integrations.

## What we offer Mono

- Volume at launch: ~100 connected accounts in month 1
- Month 6 target: 500 connected accounts
- Audience overlap: Nigerian SMBs ₦5M to ₦100M revenue, Lagos / Abuja / Kano / Port Harcourt
- Public partner page on cashtraka.co listing Mono as our bank-sync provider
- A dedicated technical contact on our side for any escalations

## Technical ask

- Mono Connect widget for account linking
- Accounts API to fetch account metadata after consent
- Transactions API with daily polling (we do not need real-time on day one)
- Webhook for new transactions once we move past polling
- Sandbox keys for development, gated production keys after the agreement is signed
- Confirmation that re-auth flows on consent expiry are supported via the widget

## Commercial ask

We have modeled ₦200/account/month at scale into the Tax+ price. We are looking for:

- A per-account monthly fee at or below ₦200 once we are past 100 accounts
- Monthly billing in NGN
- A capped commitment in the first 90 days while we ramp
- Standard SLA terms and an incident contact

If your standard pricing is higher, we can discuss a usage band that gets us there at scale.

## Timeline

- Week 0: agreement signed, sandbox keys
- Week 4: development integration complete in our staging environment
- Week 8: production launch to Tax+ subscribers

## Contact

[Founder name], [founder email], CashTraka
