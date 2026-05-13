# CashTraka Mobile

Production-ready React Native client for the CashTraka Operational Planning System. Built with Expo SDK 51, expo-router (file-based, typed), TanStack Query, Zustand, expo-secure-store + MMKV, and Sentry.

The mobile app is a **thin client over the existing Next.js API** at `cashtraka.com/api/*` — it owns presentation, local state, and offline-friendly cache. The web app remains the source of truth for business logic.

---

## Quick start

```sh
cd mobile
cp .env.example .env.local
# Fill EXPO_PUBLIC_API_BASE_URL (https://cashtraka.com for prod, http://10.0.2.2:3000 for Android emulator against local Next.js)
npm install
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator. Physical device: scan the QR with the Expo Go app.

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Web API origin (e.g. `https://cashtraka.com`). All `apiFetch` calls are relative to this. |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional. Crash + error reporting. Disabled when blank. |
| `EXPO_PUBLIC_ANALYTICS_KEY` | Optional. Forwarded to `/api/events`. Disabled when blank. |
| `EXPO_PUBLIC_ENVIRONMENT` | `development` \| `preview` \| `production`. |

Anything prefixed `EXPO_PUBLIC_` is inlined at build time and visible to the client — never put secrets there.

---

## Architecture

```
mobile/
├─ app/                          file-based routes (expo-router)
│  ├─ _layout.tsx                root: providers, error boundary, auth gate
│  ├─ +not-found.tsx             404
│  ├─ (auth)/                    unauthenticated stack
│  │  ├─ _layout.tsx
│  │  ├─ login.tsx
│  │  ├─ signup.tsx
│  │  └─ forgot-password.tsx
│  └─ (tabs)/                    authenticated bottom tabs
│     ├─ _layout.tsx             tab bar config + unread badge
│     ├─ index.tsx               Today (dashboard signals)
│     ├─ orders.tsx              customer orders list
│     ├─ production.tsx          production runs (placeholder)
│     ├─ materials.tsx           raw materials (placeholder)
│     └─ more.tsx                profile, notifications, settings
└─ src/
   ├─ api/
   │  ├─ client.ts               apiFetch() with bearer auth, timeout, envelope unwrap
   │  ├─ endpoints.ts            typed URL catalogue
   │  ├─ query-client.ts         TanStack Query config (30s stale, smart retry)
   │  └─ queries/                hooks: useOrders, useNotifications, …
   ├─ components/
   │  ├─ ui/                     primitives: Button, Input, Card, Screen
   │  └─ feature/                composed feature components, error boundary
   ├─ hooks/                     useAuth and friends
   ├─ lib/
   │  ├─ storage.ts              secureStore (Keychain/Keystore) + appStorage (MMKV)
   │  ├─ sentry.ts               initSentry, reportError, setSentryUser
   │  ├─ analytics.ts            track/screen/identify with MMKV-backed queue
   │  ├─ format.ts               kobo → naira, date, timeAgo
   │  └─ errors.ts               AppError class + classification
   ├─ stores/
   │  └─ auth.store.ts           Zustand: hydrate/login/logout/refresh
   └─ theme/
      └─ index.ts                colors, typography, spacing, radius, shadow
```

### Routing & navigation

We use **expo-router** with typed routes (`experiments.typedRoutes: true`). Two route groups give a clean auth gate:

- `(auth)` — only mounted when the user is unauthenticated.
- `(tabs)` — only mounted once a session exists.

The root `app/_layout.tsx` hydrates the auth store from secure storage on first paint, then `<RouteGate>` redirects between the two groups. Deep links land on `(tabs)` if a session exists, otherwise on `(auth)/login` with `redirect` preserved.

### State management

- **Server state**: TanStack Query. Cache keys mirror REST paths, e.g. `['orders', { status }]`. 30s `staleTime`, no refetch on window focus (mobile-friendly), retry only on transient errors. Mutations call `queryClient.invalidateQueries`.
- **Auth state**: Zustand store, persisted via `secureStore`. Holds `{ user, token, status }`. Exposes `login`, `logout`, `refresh`, `hydrate`.
- **Ephemeral UI state**: local `useState` per screen — no global UI store.

### API layer

`apiFetch<T>(path, { method?, body?, signal?, auth? })`:

- Reads bearer token from the auth store when `auth !== false`.
- Composes the caller's `AbortSignal` with a 20s default timeout.
- Unwraps the web app's `{ success, data, error }` envelope.
- Throws a typed `AppError` (network / unauthorized / forbidden / not_found / conflict / validation / payment_required / unknown) with `userMessage()` for UI display.
- On 401, calls a registered `onUnauthenticated` listener (wired in `auth.store.ts`) to log the user out and route to `(auth)/login`.

Endpoint URLs live in `src/api/endpoints.ts` so paths aren't sprinkled through components.

### Auth flow

1. App starts → `_layout.tsx` calls `useAuthStore.getState().hydrate()`.
2. `hydrate` reads `readSession()` from `expo-secure-store` (Keychain on iOS, Keystore on Android, `WHEN_UNLOCKED` accessibility).
3. If a token exists, GET `/api/auth/me` to verify; on success store user + token; on 401 clear.
4. `<RouteGate>` redirects: signed-out → `(auth)/login`, signed-in trying to access `(auth)` → `(tabs)`.
5. `login` POSTs `/api/auth/login`, stores `{ token, user }` via `writeSession`, identifies in Sentry + analytics.
6. `logout` clears secure storage and resets the React Query cache.

We do not store passwords. Tokens are short-lived JWT cookies on web; on mobile they're held in memory + Keychain only.

### Storage

Two layers, deliberately separate:

- **`secureStore`** (`expo-secure-store`) — auth tokens, refresh tokens, anything that must survive backgrounding but never sync to backups. Accessibility: `WHEN_UNLOCKED`.
- **`appStorage`** (`react-native-mmkv`) — UI preferences, draft form state, queued analytics events, TanStack Query persisted snapshots. Synchronous, fast, encrypted on iOS.

Never write tokens to MMKV. Never write large blobs to secure store.

### Error handling

- All async paths throw `AppError`. UI components catch via TanStack Query's `error` field and call `userMessage(err)` for a Nigerian-friendly message.
- React render errors are caught by `<GlobalErrorBoundary>` mounted in `app/_layout.tsx`. It reports to Sentry with the React `componentStack` and shows a "Something went wrong" screen with reset.
- Unhandled promise rejections + native crashes are captured by `@sentry/react-native` (initialized in `lib/sentry.ts`). Breadcrumbs are scrubbed to drop bearer tokens, emails, and phone numbers before transmission.
- Network errors (no connectivity, timeout) classify as `AppError('NETWORK')` and surface a retry CTA.

### Analytics

`src/lib/analytics.ts` provides `track(event, props)`, `screen(name, props)`, `identify(userId, traits)`, `flush()`.

- Events are queued in MMKV.
- Flushed in batches of 20 to `POST /api/events` every 30s and on app background.
- Auto-attaches `userId` after `identify`.
- Disabled when `EXPO_PUBLIC_ANALYTICS_KEY` is empty (local dev).

### Theming

`src/theme/index.ts` mirrors the web's Tailwind tokens 1:1 — colors, type scale, spacing, radius, shadow. No `StyleSheet.create` should ever inline a hex code; reach for `colors.*`. This keeps the brand consistent across web and mobile and means a token change applies in both clients.

---

## Building reusable components

Primitives in `src/components/ui/`:

- `<Screen>` — page scaffold. Handles safe area, optional scroll, refresh control. Use this as the outer wrapper of every screen.
- `<Card>` — surface. Pass `onPress` to make it tappable.
- `<Button>` — variants `primary | secondary | ghost | danger`, sizes `sm | md | lg`, `loading`, `iconLeft`, `iconRight`, `fullWidth`.
- `<Input>` — `label`, `hint`, `error`, slots, focused state.

Compose screens from these. Never style raw `<TouchableOpacity>` ad-hoc — extend the primitive.

---

## Adding a new feature

1. **API**: add the endpoint to `src/api/endpoints.ts`. If the response type is non-trivial, type it next to the endpoint.
2. **Query hook**: create `src/api/queries/useThing.ts` with `useThings`, `useThing`, `useCreateThing` mutations. Invalidate keys on success.
3. **Screen**: drop a file in `app/(tabs)/things.tsx` or `app/things/[id].tsx`. Use `<Screen>` + primitives.
4. **Tab entry**: if it's a top-level destination, add a tab in `app/(tabs)/_layout.tsx`. Otherwise navigate via `router.push('/things')`.

Mirror the `orders.tsx` pattern for any list screen with filters + empty state.

---

## CI / release

- Type checks: `npx tsc --noEmit` runs in CI.
- Lint: `npx expo lint`.
- Build: EAS Build with `eas.json` profiles (`development`, `preview`, `production`). The production profile points at the live API.
- OTA updates via `expo-updates` for non-native changes.
- Native bumps require a fresh build + store submission.

---

## What's intentionally out of scope (for now)

- Offline write queue. Reads are cached; writes need network. Add this when we have a clear use case.
- Push notifications. Wire `expo-notifications` + APNs/FCM in a follow-up PR.
- Biometric auth. The Keychain entry is `WHEN_UNLOCKED`; biometric prompt comes after we have user demand.
- Background sync. App refetches on foreground via TanStack Query's mount behavior — that's enough today.

---

## Troubleshooting

- **`Network request failed` on Android emulator** → use `http://10.0.2.2:3000` not `localhost`.
- **`Network request failed` on iOS simulator** → `localhost` works, but the API must be on HTTP or the cert must be trusted.
- **Stuck on splash** → `npx expo start -c` to clear the Metro cache.
- **MMKV crashes on simulator** → MMKV requires a dev build, not Expo Go. Run `npx expo prebuild && npx expo run:ios`.
- **Sentry sourcemaps missing** → set `SENTRY_AUTH_TOKEN` for the EAS build env (organization-level secret).
