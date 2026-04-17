/**
 * Transactional email via Resend.
 *
 * All senders are non-blocking: callers should not `throw` on failure. Instead
 * the function returns `{ ok, id?, error? }` and the caller decides what to do
 * (e.g. update Receipt.status = FAILED).
 *
 * The app keeps working if RESEND_API_KEY is unset — sends return an error and
 * nothing crashes. Configure for production by setting:
 *   RESEND_API_KEY    — from resend.com dashboard
 *   RESEND_FROM_EMAIL — e.g. "CashTraka <receipts@mail.cashtraka.co>"
 *   APP_URL           — used for links inside emails
 */

type SendResult = { ok: boolean; id?: string; error?: string };

async function send(args: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string /* base64 */ }[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: 'Email is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL missing)' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        attachments: args.attachments,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || data?.error?.message || `Resend ${res.status}` };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}

function escape(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function naira(n: number): string {
  return '₦' + n.toLocaleString('en-NG');
}

export const emailService = {
  /**
   * Send a receipt to the customer. Expects the PDF as a base64 attachment.
   */
  async sendReceipt(args: {
    to: string;
    business: string;
    customerName: string;
    receiptNumber: string;
    amount: number;
    receiptUrl: string;
    pdfBase64?: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#00B8E8;">Receipt</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px;">${escape(args.business)}</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">Hi ${escape(args.customerName)},</p>
    <p style="color:#475569;font-size:14px;">Thank you for your payment of <strong>${naira(args.amount)}</strong>.</p>
    <div style="margin:20px 0;padding:16px;background:#F1F5F9;border-radius:12px;">
      <div style="font-size:12px;color:#64748B;">Receipt #</div>
      <div style="font-size:18px;font-weight:700;font-family:monospace;color:#1A1A1A;">${escape(args.receiptNumber)}</div>
    </div>
    <p style="margin:16px 0;">
      <a href="${escape(appUrl + args.receiptUrl)}" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View receipt online</a>
    </p>
    <p style="color:#64748B;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px;">
      Receipt by <a href="${escape(appUrl)}" style="color:#00B8E8;text-decoration:none;font-weight:600;">CashTraka</a>
    </p>
  </div>
</body>
</html>`;
    return send({
      to: args.to,
      subject: `Your receipt from ${args.business} — ${args.receiptNumber}`,
      html,
      attachments: args.pdfBase64
        ? [{ filename: `${args.receiptNumber}.pdf`, content: args.pdfBase64 }]
        : undefined,
    });
  },

  async sendTrialStarted(args: {
    to: string;
    name: string;
    plan: string;
    trialEndsAt: Date;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const endsOn = new Date(args.trialEndsAt).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:20px;font-weight:800;">Hi ${escape(args.name)}, your ${escape(args.plan)} trial just started 🎉</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      You've got <strong>14 days</strong> to try every premium feature — unlimited
      payments, invoices, bank verification, reports, and more. No payment needed
      yet.
    </p>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      Your trial ends on <strong>${endsOn}</strong>. We'll remind you a few days before
      so you can choose to upgrade or let it expire.
    </p>
    <p><a href="${escape(appUrl)}/dashboard" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open your dashboard</a></p>
  </div>
</body></html>`;
    return send({
      to: args.to,
      subject: `Your ${args.plan} trial is active until ${endsOn}`,
      html,
    });
  },

  async sendPaymentSucceeded(args: {
    to: string;
    name: string;
    plan: string;
    amountKobo: number;
    currentPeriodEnd: Date;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const amount = '₦' + Math.round(args.amountKobo / 100).toLocaleString('en-NG');
    const renews = new Date(args.currentPeriodEnd).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:20px;font-weight:800;">Payment received — thank you, ${escape(args.name)} 🙏</div>
    <div style="margin:16px 0;padding:16px;background:#F1F5F9;border-radius:12px;">
      <div style="font-size:12px;color:#64748B;">Plan</div>
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;">${escape(args.plan)}</div>
      <div style="font-size:12px;color:#64748B;margin-top:8px;">Amount</div>
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;">${amount}</div>
      <div style="font-size:12px;color:#64748B;margin-top:8px;">Access until</div>
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;">${renews}</div>
    </div>
    <p><a href="${escape(appUrl)}/settings" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Manage subscription</a></p>
  </div>
</body></html>`;
    return send({
      to: args.to,
      subject: `Payment received — ${args.plan} is active`,
      html,
    });
  },

  async sendPaymentFailed(args: {
    to: string;
    name: string;
    plan: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:20px;font-weight:800;color:#B91C1C;">Your ${escape(args.plan)} payment failed</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      Hi ${escape(args.name)}, we weren't able to charge your card for this
      renewal. Your access has been paused until you retry.
    </p>
    <p><a href="${escape(appUrl)}/settings?billing=retry" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Retry payment</a></p>
  </div>
</body></html>`;
    return send({
      to: args.to,
      subject: `${args.plan} renewal failed — action needed`,
      html,
    });
  },

  async sendSubscriptionCancelled(args: {
    to: string;
    name: string;
    plan: string;
    accessUntil: Date | null;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const until = args.accessUntil
      ? new Date(args.accessUntil).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'now';
    const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:20px;font-weight:800;">Subscription cancelled</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      Hi ${escape(args.name)}, we've cancelled your ${escape(args.plan)} subscription.
      You'll keep premium access until <strong>${until}</strong>, then your account
      will switch back to Free. Your data stays safe either way.
    </p>
    <p><a href="${escape(appUrl)}/settings" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Change your mind?</a></p>
  </div>
</body></html>`;
    return send({
      to: args.to,
      subject: `Your ${args.plan} subscription was cancelled`,
      html,
    });
  },

  async sendWelcome(args: { to: string; name: string }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || '';
    const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:20px;font-weight:800;">Welcome to CashTraka, ${escape(args.name)} 👋</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      Track payments, know who owes you, and follow up in seconds. Jump back in
      any time:
    </p>
    <p>
      <a href="${escape(appUrl)}/dashboard" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open dashboard</a>
    </p>
  </div>
</body>
</html>`;
    return send({ to: args.to, subject: 'Welcome to CashTraka', html });
  },

  /**
   * Password-reset mail. Link expires in 30 minutes.
   */
  async sendPasswordReset(args: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<SendResult> {
    const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,sans-serif;margin:0;padding:24px;background:#F7F9F8;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #E5E7EB;border-radius:16px;padding:24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#00B8E8;">Password reset</div>
    <div style="font-size:20px;font-weight:800;margin-top:4px;">Hi ${escape(args.name)},</div>
    <p style="color:#475569;font-size:14px;margin:16px 0;">
      Someone (hopefully you) asked to reset the password on your CashTraka
      account. Click the button below to choose a new password. The link is
      good for <strong>30 minutes</strong>.
    </p>
    <p style="margin:20px 0;">
      <a href="${escape(args.resetUrl)}" style="display:inline-block;padding:12px 20px;background:#8BD91E;color:#1A1A1A;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Reset my password</a>
    </p>
    <p style="color:#64748B;font-size:12px;margin:16px 0;">
      If the button doesn&rsquo;t work, paste this link into your browser:<br>
      <span style="word-break:break-all;color:#1A1A1A;">${escape(args.resetUrl)}</span>
    </p>
    <p style="color:#64748B;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px;">
      Didn&rsquo;t ask for this? You can ignore this email — your password stays
      the same until the link is used. For your safety, the link expires in 30
      minutes.
    </p>
  </div>
</body>
</html>`;
    return send({
      to: args.to,
      subject: 'Reset your CashTraka password',
      html,
    });
  },

  /** Low-level escape hatch so other services can send arbitrary transactional mail. */
  raw: send,
};
