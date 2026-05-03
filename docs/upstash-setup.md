# Upstash setup

CashTraka's shared rate limiter (`src/lib/rate-limit.ts` and the global
limiter in `src/middleware.ts`) uses Upstash Redis to share counters
across Vercel isolates. Without Upstash configured, both fall back to
an in-memory `Map`, which is fine for local development but lets the
effective limit drift to `stated_limit x N_instances` in production.

This is the 5-minute provisioning checklist.

## 1. Create the database

1. Sign up at [console.upstash.com](https://console.upstash.com).
2. Create a Redis database. Pick a region close to your Vercel
   deployment region: Tokyo (`ap-northeast-1`) or Singapore
   (`ap-southeast-1`) work well for users in West Africa and Asia.
3. From the database overview page, copy the two REST values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2. Wire them into Vercel

Run these from the project root with the Vercel CLI installed and
logged in:

```bash
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

You can repeat with `preview` and `development` scopes if you want
the same shared limits in preview deployments.

## 3. Redeploy

```bash
vercel --prod
```

Or push to `main` and let the GitHub integration redeploy.

## 4. Confirm

After redeploy, hit any rate-limited endpoint (e.g. `/api/auth/login`)
more times than its limit allows from a single IP. Check the Upstash
console: under "Data Browser" you should see keys with the prefix
`ct:rl:` (one per limiter bucket).

## Local development

Local dev does not need Upstash. With `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` unset, the limiter quietly uses the
in-memory implementation. If you want to test against real Upstash
locally, drop the same two values into `.env.local`.

## Behaviour when Upstash is down

If Upstash is configured but unreachable at request time, the limiter
catches the network error and falls back to the in-memory path for
that single request. This trades distributed accuracy for not 500ing
every endpoint when Upstash has a hiccup.
