/**
 * Email-log status-precedence tests.
 *
 * The Resend webhook delivers events out of order — a `delivered`
 * webhook can arrive after a `bounced` webhook for the same email_id.
 * The status ladder makes sure we don't downgrade a more-terminal
 * status. If this ever regresses, the e-mail log UI silently shows
 * stale "delivered" badges for messages that bounced.
 */

import { describe, it, expect } from 'vitest';
import {
  EMAIL_STATUS_ORDER,
  shouldDowngrade,
  type EmailLogStatus,
} from './email-log.service';

describe('EMAIL_STATUS_ORDER ladder', () => {
  it('is monotonically increasing in the expected order', () => {
    const expectedOrder: EmailLogStatus[] = [
      'queued',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'complained',
      'bounced',
      'failed',
    ];
    let prev = -1;
    for (const status of expectedOrder) {
      const v = EMAIL_STATUS_ORDER[status];
      expect(v, `${status} should be > previous`).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it('covers every defined EmailLogStatus', () => {
    const all: EmailLogStatus[] = [
      'queued','sent','delivered','opened','clicked',
      'complained','bounced','failed',
    ];
    for (const s of all) {
      expect(typeof EMAIL_STATUS_ORDER[s]).toBe('number');
    }
  });
});

describe('shouldDowngrade — out-of-order webhook protection', () => {
  it('refuses to downgrade bounced → opened (the canonical race)', () => {
    expect(shouldDowngrade('opened', 'bounced')).toBe(true);
  });

  it('refuses to downgrade bounced → delivered', () => {
    expect(shouldDowngrade('delivered', 'bounced')).toBe(true);
  });

  it('refuses to downgrade failed → anything below', () => {
    const lower: EmailLogStatus[] = [
      'queued','sent','delivered','opened','clicked','complained','bounced',
    ];
    for (const s of lower) {
      expect(shouldDowngrade(s, 'failed'), `${s} should not overwrite failed`).toBe(true);
    }
  });

  it('refuses to overwrite same-status (idempotent)', () => {
    expect(shouldDowngrade('delivered', 'delivered')).toBe(true);
    expect(shouldDowngrade('bounced', 'bounced')).toBe(true);
  });

  it('allows upgrade sent → delivered', () => {
    expect(shouldDowngrade('delivered', 'sent')).toBe(false);
  });

  it('allows upgrade delivered → opened', () => {
    expect(shouldDowngrade('opened', 'delivered')).toBe(false);
  });

  it('allows upgrade opened → clicked', () => {
    expect(shouldDowngrade('clicked', 'opened')).toBe(false);
  });

  it('allows promotion clicked → bounced (bounce-after-click is possible)', () => {
    // Some MTAs report bounces even after the recipient opened
    // and clicked — typically because a forwarding hop bounced.
    // The ladder treats bounced as more terminal than clicked.
    expect(shouldDowngrade('bounced', 'clicked')).toBe(false);
  });

  it('queued is the floor — every other status upgrades over it', () => {
    const above: EmailLogStatus[] = [
      'sent','delivered','opened','clicked','complained','bounced','failed',
    ];
    for (const s of above) {
      expect(shouldDowngrade(s, 'queued'), `${s} should overwrite queued`).toBe(false);
    }
  });
});
