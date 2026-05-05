# Resend domain verification runbook

> ~30 minutes of clicking. Founder task. The result: emails sent from
> `noreply@cashtraka.co` are signed with SPF + DKIM + DMARC and don't land
> in spam. **Without this, dunning emails, receipts, and invoices silently
> fail to deliver to a meaningful slice of customers.**

---

## What you'll do

1. In Resend: ask Resend to issue DNS records for `cashtraka.co`.
2. In your DNS provider (Vercel DNS / Cloudflare / whoever holds the
   nameservers for cashtraka.co): paste those records in.
3. Wait 5–30 minutes for propagation.
4. Click "Verify" in Resend. Green check across all four records.
5. Send a test message to `gmail`, `outlook`, `yahoo` addresses you control.
   Confirm none land in spam.

That's it. No CashTraka code change required — your `RESEND_API_KEY`
already points to the project; once the domain is verified the existing
`emailService` calls start signing automatically.

---

## Step 1 — Resend dashboard

1. Open https://resend.com/domains and sign in.
2. If `cashtraka.co` isn't listed, click **+ Add Domain**.
   - Domain name: `cashtraka.co`
   - Region: pick the one closest to Lagos. **eu-west-1** (Ireland) is
     a good default; us-east-1 also works if your customers are global.
3. Resend now shows you a table with **4 DNS records** to add: usually
   one MX, one TXT (SPF), one TXT (DKIM, named `resend._domainkey`),
   and one TXT (DMARC).

Leave this tab open — you'll come back to click **Verify**.

---

## Step 2 — DNS provider

### If your DNS is on Vercel

1. Open https://vercel.com/<your-team>/<your-project>/settings/domains.
2. Click `cashtraka.co` → DNS Records.
3. For each row Resend gave you, click **Add** and copy:
   - **Type:** TXT or MX (matches Resend)
   - **Name:** the host part exactly as Resend shows it. Vercel auto-strips
     `cashtraka.co` from the suffix; if Resend says `send.cashtraka.co`,
     you type `send` here.
   - **Value:** the full value string from Resend (yes, including all
     the `v=spf1`, `k=rsa`, etc. boilerplate)
   - **TTL:** leave the default
   - **Priority** (only for MX): 10

### If your DNS is on Cloudflare

Same idea but the dashboard layout differs:

1. https://dash.cloudflare.com → cashtraka.co → DNS → Records.
2. **+ Add record** for each Resend row.
3. **Important:** for the TXT records, set **Proxy status: DNS only**
   (the orange cloud OFF). Cloudflare's proxy will rewrite TXT contents
   if it's on, breaking SPF/DKIM verification.

### If your DNS is somewhere else (Namecheap, GoDaddy, etc.)

Same shape — find the DNS Records / Zone Editor / nameserver settings
page, add four records as TXT/MX with the values Resend gave you. The
hardest part is host-name notation: some providers want `send`, others
want `send.cashtraka.co`, and a few want `send.cashtraka.co.` with the
trailing dot. If Resend's verification fails after 30 minutes, swap
between these formats and re-check.

---

## Step 3 — Wait, then verify

DNS propagation usually takes 5–10 minutes. Sometimes 30. If after 30 the
records still don't show green:

```bash
# Use a public resolver to bypass any local cache
dig +short TXT resend._domainkey.cashtraka.co @1.1.1.1
dig +short TXT cashtraka.co @1.1.1.1
dig +short TXT _dmarc.cashtraka.co @1.1.1.1
```

If `dig` returns the value Resend expects, the records are live and
Resend's "Verify" should now go green. If `dig` returns nothing or a
different value, your DNS provider is the problem.

---

## Step 4 — Send a test

Once Resend shows all green:

1. In the Resend dashboard, **Emails → Send test email**.
2. To: yourself at gmail, outlook, yahoo, plus a Nigerian provider
   (yahoo.com.ng or a friend's mail.com.ng).
3. Confirm:
   - All arrive in **Inbox**, not Spam / Junk / Promotions.
   - The "From" displays as your verified domain, not `onresend.com`.
   - The recipient header shows `dkim=pass` and `spf=pass` (gmail: click
     `▼` next to the sender name → "Show original").

If any provider lands you in spam, leave the message there for 24 hours
and check again — provider reputation builds over a few days of clean
sending. If still in spam after 48h: open the original headers and look
for `dmarc=fail` or `spf=softfail`. That points at a still-broken DNS
record.

---

## Step 5 — Update CashTraka if the From address changes

The codebase currently sends from whatever `RESEND_FROM` env var (or the
default in `email.service.ts`) is set to. After verification, make sure
the env var on Vercel is set to a verified address:

```
RESEND_FROM="CashTraka <noreply@cashtraka.co>"
```

If it isn't already, set it:

```bash
vercel env add RESEND_FROM production
# value: CashTraka <noreply@cashtraka.co>
vercel deploy --prod
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Resend shows "Pending" forever | Cloudflare proxy is on the TXT record | Toggle proxy off (DNS only / grey cloud) |
| `dig` shows nothing | TTL hasn't elapsed yet, or you typed the host wrong | Wait 30min, then check the host-name format |
| `dkim=fail` on Gmail | DKIM record value got truncated (some providers wrap at 255 chars) | Re-add as a single record without manual line breaks |
| Resend says "DKIM signature mismatch" | You have an old DKIM record with the same selector | Delete the old `resend._domainkey` record, add the new one |
| Mail still in Spam after 48h | Domain reputation isn't built yet | Send 5–10 messages a day for a week to addresses you trust; reputation grows. Don't blast the list immediately. |

---

## What I (the dev / code) already did

Nothing in the codebase needs to change for this. The wiring already
present:

- `RESEND_API_KEY` env var consumed by `src/lib/services/email.service.ts`
- `RESEND_FROM` (or default) used as the From header
- All `emailService.send*` methods queue through Resend

So this entire doc is a runbook for **you**, not work I need to do. Once
the DNS is green, Resend signs everything automatically — no redeploy
needed.
