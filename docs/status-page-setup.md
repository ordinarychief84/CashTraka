# Status page setup runbook

> 30 minutes. Founder task. Result: when prod goes down, customers see a
> public status indicator instead of a white page, and you get an email
> + SMS within 2 minutes of the first failure.

---

## What I (the dev / code) already did

- `GET /api/health` — endpoint that returns `200 { ok: true, db: "up" }`
  on success, `503 { ok: false, db: "down" }` on a database connectivity
  failure. Tiny payload, no caching, no auth. Designed to be the
  synthetic-monitor target.

That's the entire code change. The rest is account setup on a third-party
status-page provider.

---

## Recommended provider: Better Stack

Free tier covers what you need: 10 monitors, 30s check interval,
unlimited status pages, email + SMS alerts. https://betterstack.com.

Skip Statuspage.io — it's $29/mo for the equivalent. UptimeRobot's free
tier is 5-minute intervals, too slow for an outage that should trigger
in under 2 minutes.

If your budget is genuinely zero and you don't care about a public
status page, just use UptimeRobot and skip the public-page step.

---

## Step 1 — Create the account

1. https://betterstack.com/uptime → **Sign up**.
2. Skip the team-invite prompt; you're solo for now.
3. Skip integrations on the welcome flow — you'll add Slack later.

---

## Step 2 — Create the monitor

1. **Monitors → Create monitor**.
2. **Monitor type:** HTTP(S)
3. **URL:** `https://www.cashtraka.co/api/health`
4. **Check frequency:** every 30 seconds (the free tier minimum). 1m
   is also fine if you're conscious of monitor count.
5. **Region:** EU + Asia (or whichever two you want). Skip US-only —
   the production deploy is on Vercel and the latency baseline is
   different per region.
6. **Expected status:** 200 OK
7. **Body must contain (optional but recommended):** `"ok":true`
   This guards against the rare case where a misconfigured Vercel deploy
   returns a 200 but with empty/unexpected body.
8. **Alert recipients:** your email + your phone number for SMS.
9. **Alert when:** down for 2 consecutive checks. Two consecutive 30s
   failures = 1 minute of downtime before you're paged. That's the
   sweet spot — quick enough to catch real outages, slow enough to
   avoid false-positive alerts from one transient blip.
10. Save.

---

## Step 3 — Create a public status page

Optional but valuable: when CashTraka has a Paystack outage or your
Neon DB has a latency blip, customers can self-serve "is it just me?"
without flooding `support@`.

1. **Status pages → Create status page**.
2. **Subdomain:** `status.cashtraka.co` (or `cashtraka.betteruptime.com`
   if you don't want to set up a custom domain).
3. **Display name:** CashTraka
4. **Components:**
   - Web app (linked to the monitor from Step 2)
   - Database (skip if you don't have a separate Neon monitor)
   - Email delivery (skip until you set up a Resend monitor)
   - Payment processing (skip — Paystack publishes their own status)
5. **Theme:** match your brand (cyan accent, clean white).

If you go with the custom subdomain `status.cashtraka.co`:

1. Better Stack gives you a CNAME target.
2. Add it to your DNS provider as a CNAME record: `status` →
   `xyz.betteruptime.com.` (whatever they show).
3. Wait 10 minutes. Confirm `https://status.cashtraka.co` loads the
   page. Better Stack provisions the TLS cert automatically.

---

## Step 4 — Wire the status link into CashTraka

Once `status.cashtraka.co` is live, add a footer link on the marketing
site so customers can find it:

```tsx
// src/components/marketing/Footer.tsx
<a href="https://status.cashtraka.co" target="_blank" rel="noopener">
  Status
</a>
```

I haven't shipped this yet — wire it in once the subdomain is live so
you don't ship a dead link.

---

## Step 5 — Test the alert

Trick the monitor into failing on purpose to verify alerts work.

1. **Better Stack → Monitors → Pause**.
2. **Edit monitor → Body must contain:** change to `"never_match"`.
3. **Save → Resume**.
4. Wait 90 seconds. You should get an email + SMS.
5. Edit back to `"ok":true`. Save. You should get a **resolved** alert.

This dry run catches misconfigured alert routing before the real first
outage — when nobody wants to discover their email address typo.

---

## Step 6 — Add a Slack channel (later)

Once you have a team Slack:

1. Better Stack → Integrations → Slack → Connect.
2. Pick a channel like `#alerts` or `#oncall`.
3. The monitor's existing alert rule will additionally post there.

---

## Maintenance

- **Monthly:** glance at Better Stack's "Last 30 days" availability.
  Anything below 99.5% is worth investigating root-cause (Vercel,
  Neon, or your code).
- **Quarterly:** repeat the Step 5 alert dry-run. Phone numbers get
  reassigned, email rules change. Better to discover during a planned
  test than during 3am downtime.

---

## What this DOES NOT cover

- Real-time per-feature health (Paystack status, Resend status, etc.).
  Those are separate monitors you can add per provider — Better Stack
  supports HTTP probes for any URL. Add Paystack status when you're
  paying for the team tier.
- Latency SLO (P95 of `/api/health` < 500ms etc.). Once you have
  enough customers to care about latency, add a separate latency
  monitor with the threshold set; it'll alert separately from the
  pure uptime check.
