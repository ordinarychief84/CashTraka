# Sentry setup runbook

> The code-side instrumentation is already shipped (`sentry.client.config.ts`,
> `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`,
> wrapped `next.config.js`). Without env vars set, Sentry is a no-op — the
> app boots and runs with zero overhead. The remaining work is yours: sign
> up, paste two values into Vercel, redeploy. ~15 minutes.

---

## What you'll do

1. Create a free Sentry account, add a Next.js project.
2. Grab the DSN.
3. Generate an API auth token for source-map upload.
4. Add 4 env vars in Vercel.
5. Redeploy. Throw a test error. See it in Sentry.

---

## Step 1 — Sentry account + project

1. Go to https://sentry.io/signup. The free **Developer plan** gives you
   5,000 errors/month and 50 replays/month — plenty for first 100 customers.
2. After signup, create a new **Project**:
   - Platform: **Next.js**
   - Project name: `cashtraka-web`
   - Alert frequency: "On every new issue" (default)
3. After creating it, Sentry shows a wizard with a DSN — copy it. It looks
   like `https://abc123@o123456.ingest.us.sentry.io/789012`.
4. **Skip the wizard's "Install the SDK" step.** I already did that.

---

## Step 2 — API auth token (for source-map upload)

Without source maps, every error in Sentry shows minified gibberish like
`a.qZ7@chunk-jkN12.js:1:8745`. With source maps, you see the original
TypeScript file + line number.

1. https://sentry.io/settings/account/api/auth-tokens/
2. **Create New Token**.
3. Scopes: tick `project:releases` and `project:write` (only these two).
4. Token name: `cashtraka-vercel-deploy`.
5. Copy the token. **You'll never see it again** — paste it into Vercel
   immediately.

---

## Step 3 — Vercel env vars

Open https://vercel.com/<team>/cashtraka/settings/environment-variables
and add these four. **All four** for **Production** environment (and
Preview if you want preview deploys monitored too):

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://abc...@o....ingest.us.sentry.io/...` | The DSN from Step 1. The `NEXT_PUBLIC_` prefix bundles it into the browser SDK. |
| `SENTRY_DSN` | (same value as `NEXT_PUBLIC_SENTRY_DSN`) | Server-side init reads this. Two vars, same value, intentionally — keeps client/server boundaries clear if you later want to rotate one. |
| `SENTRY_ORG` | The slug after `https://sentry.io/organizations/` in your URL bar | e.g. `cashtraka` |
| `SENTRY_PROJECT` | `cashtraka-web` (or whatever you named the project) | Used by build-time source-map upload only |
| `SENTRY_AUTH_TOKEN` | Token from Step 2 | Mark as **sensitive** — never commit, never log. |

Save each one.

---

## Step 4 — Redeploy

Two ways:

```bash
# from the local repo
vercel deploy --prod
```

Or just **Redeploy** the latest production deployment from the Vercel
dashboard. The build will take ~30s longer than usual on the first run
(uploading source maps to Sentry); subsequent builds are normal speed.

In the build logs you should see a line like:
```
Sentry CLI: Uploaded 247 source maps for cashtraka-web@<commit-sha>
```

If it says `Skipping source map upload` you've missed `SENTRY_AUTH_TOKEN`
or `SENTRY_ORG`/`SENTRY_PROJECT`.

---

## Step 5 — Throw a test error

Open the deployed app at https://www.cashtraka.co and append
`?sentry_test=1` to any path. Easier: hit a route handler that throws
on demand:

```bash
# Trigger a known 500 to confirm errors flow through to Sentry. After
# the test, immediately resolve the issue in Sentry's UI so it doesn't
# clutter your real error feed.
curl -X POST https://www.cashtraka.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"oops","password":""}'
```

Within 30 seconds you should see an issue appear at
https://sentry.io/organizations/<your-org>/issues/. Click it — the
stack trace should reference real `.ts` filenames and line numbers, not
minified bundle hashes. If it does, source-map upload is working.

---

## Step 6 — Set the alert rule

Sentry's default alert rule fires on every new issue, which gets noisy
fast. Replace it with a noise-filtered version:

1. https://sentry.io/organizations/<your-org>/alerts/rules/
2. Edit the auto-created rule (or create a new one):
   - **When:** A new issue is created
   - **Filter (optional):** environment = production
   - **Filter (recommended):** issue.is_unresolved
   - **Action:** Send a notification to your email
3. Save. You'll get one email per genuinely new issue, which is the
   right cadence for the first 6 months.

For a louder alarm later — when you have a Slack workspace — install
Sentry's Slack integration and route to a `#alerts` channel.

---

## What's already wired in code

- `sentry.client.config.ts` — browser-side init, ignores common false
  positives (browser-extension noise, ResizeObserver chatter, etc.).
- `sentry.server.config.ts` — Node-runtime init. Strips request body,
  cookies, and most headers from error events to keep PII out of Sentry.
  We log enough for triage (host, user-agent) but not enough to violate
  NDPR.
- `sentry.edge.config.ts` — Edge-runtime init for middleware.ts.
- `instrumentation.ts` — Next.js 14 hook that picks the right config
  based on `NEXT_RUNTIME`.
- `next.config.js` — wrapped with `withSentryConfig`. Source-map upload
  only fires when `SENTRY_AUTH_TOKEN` is present, so missing config
  doesn't break the build.
- `src/app/global-error.tsx` — captures React render errors via
  `Sentry.captureException(error)`.
- CSP in `next.config.js` already allows
  `https://*.ingest.sentry.io / .us.sentry.io / .de.sentry.io` so the
  browser SDK can POST events without being blocked.

---

## Cost notes

The free Developer plan: 5,000 errors / 50 replays / 10,000 spans per
month. CashTraka with 100 active sellers should fit comfortably in
free. If you blow past it, the Team plan is $26/mo and includes
50,000 errors. Don't pay for it until you have to.

We deliberately set `replaysSessionSampleRate: 0` in
`sentry.client.config.ts` — recording user sessions costs more and adds
PII risk (we'd capture customer phone numbers and amounts on screen).
Turn it on later only if you're debugging a specific user-reported
issue, not as a default.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No issues appearing in Sentry | DSN not set, or wrong DSN | Check `NEXT_PUBLIC_SENTRY_DSN` matches Sentry exactly, then redeploy |
| Issues appear but stack trace is minified | Source-map upload failed | Check `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Look at the Vercel build log. |
| Sentry blocked by browser CSP | Stale deploy without the connect-src update | Trigger a new deploy after pulling latest main |
| Too many events: quota exceeded | tracesSampleRate too high, or a single issue is exploding | Either resolve the noisy issue, or lower `tracesSampleRate` from 0.1 to 0.05 in `sentry.client.config.ts` |
