# Virtual NUBAN partnership for CashTraka invoice payments

*Addressed to Wema Bank. We are also evaluating Sterling and Providus and will pick on technical fit and commercial terms.*

## TL;DR

CashTraka (cashtraka.co) issues FIRS-compliant invoices for Nigerian SMBs. On our Tax+ tier (₦25,000/month) we want to mint a unique virtual NUBAN account per invoice so customers can transfer any amount and have the payment auto-reconciled. We are looking for a VA API agreement with daily auto-settlement to the seller's primary bank.

Our launch volume is 500 invoices/day, scaling to 5,000/day by month 6, with an average invoice value of ₦18,000. We want sandbox access while we negotiate, and we can integrate within 4 weeks of an agreement. We are evaluating Wema, Sterling, and Providus and would like a written quote covering per-VA pricing, transaction fees, settlement timing, and any monthly minimums.

## Subject line

CashTraka: virtual NUBAN API partnership for invoice payments, request for quote

## Who we are

CashTraka is a Nigerian SMB SaaS for receipts, invoices, debt tracking, and FIRS-compliant tax invoices, running on Next.js with Postgres on Neon. We have paying users today. The team is founder-led and ships weekly.

## What we are building

On our Tax+ tier we are replacing the current "paste your bank SMS to confirm payment" flow with a virtual account per invoice. When the seller creates an invoice, we mint a unique 10-digit NUBAN account tied to that invoice. The account number prints on the invoice PDF and the public pay page. The customer transfers any amount to that NUBAN; your bank notifies us via webhook; we credit the invoice, send a receipt, and mark it paid. Settlement to the seller's primary bank happens daily.

## Why we are reaching out

We want a VA API agreement with daily auto-settlement to the seller's primary operating bank account, regardless of which bank that is. We are talking to Wema first because Wema is the most common NIP partner for Nigerian fintechs, but we are also evaluating Sterling and Providus.

## What we offer the bank

- Volume at launch: 500 invoices/day, so 500 VAs created/day
- Month 6 target: 5,000 invoices/day
- Average invoice value: ₦18,000
- Active sellers in Lagos, Abuja, Kano, and Port Harcourt
- Public partner-bank logo placement on our pricing page and our Tax+ feature page
- Co-marketing on launch (LinkedIn, X, Nigerian SMB press)

## Technical ask

- VA creation API (single VA per invoice, programmatic)
- Webhook on inbound transfer with reference, amount, sender name, sender bank
- Settlement reconciliation report (daily CSV or API)
- Sandbox keys before contract signing if possible, otherwise immediately after
- The KYC flow we should integrate, including which seller documents you need at onboarding and whether seller BVN plus CAC is sufficient

## Commercial ask

We need a written quote on:

- Per-VA creation fee
- Per-inbound-transaction fee
- Daily settlement fee, if any
- Monthly minimum, if any
- Float terms on the settlement account

For the economics on Tax+ to work, we have a hard ceiling of **₦50 per VA created** and **₦20 per inbound transaction**. We will pay above that for Wema reliability if the rest of the deal is right, but please flag early if your standard rates are well outside that range.

## Timeline

- Week 0: NDA, then commercial term sheet
- Week 1-3: agreement signed, sandbox keys
- Week 4: production integration complete, soft launch to 20 Tax+ pilot users
- Week 6: full rollout to all Tax+ subscribers

## Contact

[Founder name], [founder email], CashTraka
