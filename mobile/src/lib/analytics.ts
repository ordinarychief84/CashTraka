/**
 * Lightweight analytics layer. Today this is a thin queue that buffers
 * events to MMKV and flushes to the web app's `/api/events` endpoint
 * (server-side route — not yet built; see TODO at the bottom of this
 * file) once we have connectivity. The interface deliberately matches
 * Segment / Posthog / RudderStack so we can swap implementations
 * without touching call sites.
 *
 * Conventions (match Mixpanel / Posthog defaults):
 *   - Event names: `verb_object` snake_case, past-tense for completed
 *     actions ("order_created", "production_started"), present-tense
 *     for state changes ("screen_viewed"). NEVER nested.
 *   - Properties: snake_case keys, primitive values, no PII (no email,
 *     phone, names, amounts in naira — amounts MAY be order-of-magnitude
 *     buckets like "₦100k-1M").
 *
 * Privacy: every event is associated with the currently logged-in
 * userId (anonymous ID before login). No customer / supplier names
 * ever travel through here.
 */

import { appStorage } from './storage';
import { reportError } from './sentry';
import Constants from 'expo-constants';

const QUEUE_KEY = 'analytics.queue';
const FLUSH_BATCH = 20;

type AnalyticsEvent = {
  /** snake_case verb_object, e.g. order_created */
  name: string;
  /** Properties — primitive values only. */
  props?: Record<string, string | number | boolean | null>;
  /** Wall-clock time when the event happened, set by the SDK. */
  ts: number;
  /** Currently signed-in user id, or null pre-login. */
  userId: string | null;
};

let userId: string | null = null;

export const analytics = {
  identify(id: string | null) {
    userId = id;
  },

  track(name: string, props?: AnalyticsEvent['props']) {
    const evt: AnalyticsEvent = { name, props, ts: Date.now(), userId };
    const queue = (appStorage.get<AnalyticsEvent[]>(QUEUE_KEY) ?? []).concat(evt);
    appStorage.set(QUEUE_KEY, queue);
    if (queue.length >= FLUSH_BATCH) {
      // Fire-and-forget. Failures stay queued; the next flush retries.
      void this.flush();
    }
  },

  screen(name: string, props?: AnalyticsEvent['props']) {
    this.track('screen_viewed', { screen: name, ...props });
  },

  async flush(): Promise<void> {
    const queue = appStorage.get<AnalyticsEvent[]>(QUEUE_KEY) ?? [];
    if (queue.length === 0) return;
    const base =
      (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? '';
    if (!base) return;
    try {
      const res = await fetch(`${base}/api/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: queue }),
      });
      if (res.ok) {
        appStorage.set(QUEUE_KEY, []);
      }
      // On 4xx/5xx leave the queue intact — try again on next flush.
    } catch (err) {
      // Network failure is the common case; not worth a Sentry capture
      // every time. Only report if the queue grows past a threshold.
      if (queue.length > 200) reportError(err, { tags: { area: 'analytics' } });
    }
  },
};

/*
 * TODO server-side: add `src/app/api/events/route.ts` to the web app
 * that authenticates via the same session cookie (or a mobile-issued
 * bearer), validates the batch with Zod, and inserts to an `EventLog`
 * table (already on the recommendations list). The mobile client is
 * future-proof: it'll flush whatever endpoint is at /api/events.
 */
