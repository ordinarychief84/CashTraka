/**
 * Transactional email via Resend — CashTraka branded template system.
 *
 * Every email shares a consistent branded layout:
 *   • CashTraka logo (blue top / green bottom SVG)
 *   • Green (#8BD91E) primary CTA buttons
 *   • Blue (#00B8E8) accent for links and labels
 *   • Dark ink (#1A1A1A) text on soft cream (#F7F9F8) background
 *   • Consistent footer with unsubscribe and help links
 *
 * All senders are non-blocking: callers should not `throw` on failure. Instead
 * the function returns `{ ok, id?, error? }` and the caller decides what to do.
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

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function naira(n: number): string {
  return '₦' + n.toLocaleString('en-NG');
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ─── Branded layout wrapper ─────────────────────────────────────────── */

const APP_NAME = 'CashTraka';

const LOGO_URL = (process.env.APP_URL || 'https://cashtraka.vercel.app') + '/icon-192.png';

const LOGO_HTML = `
<div style="text-align:center;padding:28px 0 20px;">
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="vertical-align:middle;padding-right:10px;">
        <img src="${LOGO_URL}" alt="CashTraka" width="36" height="36" style="display:block;border-radius:8px;" />
      </td>
      <td style="vertical-align:middle;">
        <span style="font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#1A1A1A;">Cash<span style="color:#1A1A1A;">Traka</span></span>
      </td>
    </tr>
  </table>
</div>`;

function ctaButton(label: string, href: string): string {
  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:#8BD91E;border-radius:10px;padding:14px 28px;">
      <a href="${esc(href)}" style="color:#1A1A1A;text-decoration:none;font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;display:inline-block;">${esc(label)}</a>
    </td>
  </tr>
</table>`;
}

function link(label: string, href: string): string {
  return `<a href="${esc(href)}" style="color:#00B8E8;text-decoration:none;font-weight:600;">${esc(label)}</a>`;
}

function infoRow(label: string, value: string): string {
  return `
<tr>
  <td style="padding:8px 16px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;border-bottom:1px solid #F1F5F9;">${esc(label)}</td>
  <td style="padding:8px 16px;font-size:15px;font-weight:700;color:#1A1A1A;text-align:right;border-bottom:1px solid #F1F5F9;">${esc(value)}</td>
</tr>`;
}

function layout(body: string, options?: { preheader?: string }): string {
  const appUrl = process.env.APP_URL || 'https://cashtraka.vercel.app';
  const preheader = options?.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">${esc(options.preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td{font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,sans-serif;}
    a{text-decoration:none;}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;padding:12px!important;}
      .inner{padding:20px 16px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F9F8;color:#1A1A1A;-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F7F9F8;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td>
              ${LOGO_HTML}
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td class="inner" style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px 28px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94A3B8;">
                Sent by ${link(APP_NAME, appUrl)} · Stop chasing payments, start receiving them.
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E1;">
                ${link('Help & Support', appUrl + '/contact')} · ${link('Privacy Policy', appUrl + '/privacy')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Divider ─────────────────────────────────────────────────────────── */
const DIVIDER = '<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />';

/* ─── Email flows ─────────────────────────────────────────────────────── */

export const emailService = {
  /* ══════════════════════════════════════════════════════════════════════
   *  0. OTP VERIFICATION — sent on signup for email verification
   * ══════════════════════════════════════════════════════════════════════ */
  async sendVerificationOtp(args: { to: string; name: string; code: string }): Promise<SendResult> {
    const firstName = args.name.split(' ')[0];
    return send({
      to: args.to,
      subject: `${args.code} is your CashTraka verification code`,
      html: layout(
        `<div style="text-align:center;padding:32px 0 16px">
           <div style="font-size:14px;color:#64748b;margin-bottom:8px">Your verification code</div>
           <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#0f172a;font-family:monospace;padding:16px 0">
             ${esc(args.code)}
           </div>
           <div style="font-size:13px;color:#94a3b8;margin-top:4px">This code expires in 10 minutes</div>
         </div>
         <p style="font-size:15px;color:#334155;margin-top:24px">
           Hi ${esc(firstName)}, welcome to CashTraka! Enter the code above in the
           app to verify your email and finish setting up your account.
         </p>
         <p style="font-size:13px;color:#94a3b8;margin-top:20px">
           If you didn't create a CashTraka account, please ignore this email.
         </p>`,
      ),
    });
  },


  /* ══════════════════════════════════════════════════════════════════════
   *  1. WELCOME EMAIL — sent after onboarding completes
   * ══════════════════════════════════════════════════════════════════════ */
  async sendWelcome(args: { to: string; name: string; businessType?: string }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const isLandlord = args.businessType === 'property_manager';
    const firstName = args.name.split(' ')[0];

    /* ── Step definitions (adaptive per business type) ──────────────── */
    const steps: { num: number; icon: string; title: string; desc: string; href: string; linkLabel: string }[] = isLandlord
      ? [
          { num: 1, icon: '⚙️', title: 'Complete your profile', desc: 'Add your business name, WhatsApp number, and bank details so tenants see a professional brand on every receipt.', href: `${appUrl}/settings`, linkLabel: 'Set up profile' },
          { num: 2, icon: '🏢', title: 'Add your first property', desc: 'Create a building with units so you can assign tenants, track occupancy, and monitor rent.', href: `${appUrl}/properties`, linkLabel: 'Add a property' },
          { num: 3, icon: '👤', title: 'Add tenants', desc: 'Link tenants to units with rent amounts and lease dates — CashTraka will handle reminders automatically.', href: `${appUrl}/tenants`, linkLabel: 'Add a tenant' },
          { num: 4, icon: '🔗', title: 'Send a PayLink', desc: 'Generate a payment link and send it via WhatsApp or email. Tenants click, pay, and you get notified instantly.', href: `${appUrl}/paylinks`, linkLabel: 'Create PayLink' },
          { num: 5, icon: '👥', title: 'Invite your team', desc: 'Add a property manager or assistant with the right permissions so they can help without full access.', href: `${appUrl}/team`, linkLabel: 'Invite staff' },
        ]
      : [
          { num: 1, icon: '⚙️', title: 'Complete your profile', desc: 'Add your business name, WhatsApp number, and bank details so customers see a professional brand on every receipt.', href: `${appUrl}/settings`, linkLabel: 'Set up profile' },
          { num: 2, icon: '💰', title: 'Record your first sale', desc: 'Tap "Record payment" to log a sale — your dashboard will come alive with real-time revenue tracking.', href: `${appUrl}/payments`, linkLabel: 'Record a payment' },
          { num: 3, icon: '👤', title: 'Add your customers', desc: 'Build your customer list so you can track who owes what, send receipts, and follow up on debts.', href: `${appUrl}/customers`, linkLabel: 'Add a customer' },
          { num: 4, icon: '🔗', title: 'Send a PayLink', desc: 'Generate a payment link and share it via WhatsApp or email — customers tap, pay, and you get notified.', href: `${appUrl}/paylinks`, linkLabel: 'Create PayLink' },
          { num: 5, icon: '👥', title: 'Invite your team', desc: 'Add a cashier or manager with the right permissions so they can help without full access.', href: `${appUrl}/team`, linkLabel: 'Invite staff' },
        ];

    /* ── Build step cards HTML ──────────────────────────────────────── */
    let stepsHTML = '';
    for (const s of steps) {
      stepsHTML += `
      <tr>
        <td style="padding:0 0 16px;">
          <a href="${esc(s.href)}" style="text-decoration:none;display:block;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:16px 18px;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <!-- Number badge + icon -->
                      <td width="52" style="vertical-align:top;">
                        <div style="width:44px;height:44px;background:#F0F9FF;border:2px solid #BAE6FD;border-radius:12px;text-align:center;line-height:42px;font-size:20px;">
                          ${s.icon}
                        </div>
                      </td>
                      <!-- Content -->
                      <td style="padding-left:14px;vertical-align:top;">
                        <div style="margin-bottom:4px;">
                          <span style="display:inline-block;background:#00B8E8;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;letter-spacing:0.3px;vertical-align:middle;">STEP ${s.num}</span>
                        </div>
                        <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;color:#0F172A;margin-bottom:4px;line-height:1.3;">
                          ${esc(s.title)}
                        </div>
                        <div style="font-size:13px;color:#64748B;line-height:1.5;margin-bottom:8px;">
                          ${esc(s.desc)}
                        </div>
                        <div style="font-size:13px;font-weight:700;color:#00B8E8;">
                          ${esc(s.linkLabel)} →
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </a>
        </td>
      </tr>`;
    }

    /* ── Assemble final email body ──────────────────────────────────── */
    const body = `
      <!-- Hero -->
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;line-height:1;margin-bottom:16px;">🎉</div>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#0F172A;line-height:1.2;">
          Welcome to CashTraka, ${esc(firstName)}!
        </h1>
        <p style="margin:0;font-size:15px;color:#64748B;line-height:1.5;">
          ${isLandlord
            ? "Your property management toolkit is ready. Let's get everything set up in 5 quick steps."
            : "Your business dashboard is ready. Let's get everything set up in 5 quick steps."
          }
        </p>
      </div>

      ${DIVIDER}

      <!-- Progress indicator -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00B8E8;margin-bottom:6px;">
          Your setup checklist
        </div>
        <p style="margin:0;font-size:13px;color:#94A3B8;">
          Click each step below to get started — each one takes less than 2 minutes.
        </p>
      </div>

      <!-- Step cards -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:16px;padding:16px;">
        <tr>
          <td style="padding:16px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              ${stepsHTML}
            </table>
          </td>
        </tr>
      </table>

      <!-- Main CTA -->
      <div style="text-align:center;margin-top:8px;">
        ${ctaButton('Open your dashboard', appUrl + '/dashboard')}
      </div>

      ${DIVIDER}

      <!-- Motivation section -->
      <div style="text-align:center;padding:8px 0 16px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0F172A;">
          ${isLandlord ? '🏠 Built for Nigerian landlords' : '💼 Built for Nigerian businesses'}
        </p>
        <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
          ${isLandlord
            ? 'Track every property, every tenant, every payment — and get reminded before things slip.'
            : 'Record sales, send receipts, track expenses, and always know your real profit.'
          }
        </p>
      </div>

      ${DIVIDER}

      <!-- Help section -->
      <div style="background:#F0F9FF;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:8px;">Need a hand?</div>
        <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
          Reply to this email or visit our ${link('help center', appUrl + '/contact')} — a real human will respond.
        </p>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:#475569;text-align:center;line-height:1.6;">
        We're excited to have you on board! 🚀<br>
        <strong style="color:#0F172A;">— The CashTraka Team</strong>
      </p>`;

    return send({
      to: args.to,
      subject: `Welcome to CashTraka — your 5-step setup guide`,
      html: layout(body, {
        preheader: isLandlord
          ? '5 quick steps to start managing your properties like a pro.'
          : '5 quick steps to start tracking payments and growing your business.',
      }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  2. SUBSCRIPTION RECEIPT — sent when a user pays for a plan
   * ══════════════════════════════════════════════════════════════════════ */
  async sendSubscriptionReceipt(args: {
    to: string;
    name: string;
    plan: string;
    amountKobo: number;
    reference: string;
    currentPeriodEnd: Date;
    businessName?: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const amount = naira(Math.round(args.amountKobo / 100));
    const renewDate = fmtDate(args.currentPeriodEnd);
    const today = fmtDate(new Date());

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#ECFDF5;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">&#10003;</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Payment successful</h1>
        <p style="margin:0;font-size:14px;color:#475569;">Thank you, ${esc(args.name)}. Your subscription is active.</p>
      </div>

      ${DIVIDER}

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        <tr>
          <td colspan="2" style="padding:14px 16px 8px;font-size:11px;font-weight:700;color:#00B8E8;text-transform:uppercase;letter-spacing:1.2px;">Subscription Receipt</td>
        </tr>
        ${infoRow('Plan', args.plan)}
        ${infoRow('Amount', amount)}
        ${infoRow('Date', today)}
        ${infoRow('Renews on', renewDate)}
        ${infoRow('Reference', args.reference)}
        ${args.businessName ? infoRow('Business', args.businessName) : ''}
      </table>

      ${DIVIDER}

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Your <strong>${esc(args.plan)}</strong> plan is now active. You have full access to all premium features until <strong>${renewDate}</strong>.
        We'll automatically renew your subscription — you can cancel anytime from settings.
      </p>

      ${ctaButton('Go to dashboard', appUrl + '/dashboard')}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        Need help? ${link('Contact support', appUrl + '/contact')} · ${link('Manage subscription', appUrl + '/settings')}
      </p>`;

    return send({
      to: args.to,
      subject: `Receipt: ${args.plan} subscription — ${amount}`,
      html: layout(body, { preheader: `Your ${args.plan} subscription is active. Amount: ${amount}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  2b. DAILY PULSE — morning summary email
   * ══════════════════════════════════════════════════════════════════════ */
  async sendDailyPulse(args: {
    to: string;
    name: string;
    todayRevenue: number;
    revenueDelta: number;
    totalOwed: number;
    overdueDebts: number;
    claimedPaylinks: number;
    remindersDueToday: number;
    topDebtors: { name: string; amount: number }[];
    yesterdaySpent?: number;
    suggestions?: { emoji: string; label: string }[];
    // Promise to Pay & auto-confirmation stats
    activePromises?: number;
    brokenPromises?: number;
    autoConfirmedToday?: number;
    autoConfirmedAmountToday?: number;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const today = fmtDate(new Date());

    const deltaColor = args.revenueDelta >= 0 ? '#72B515' : '#DC2626';
    const deltaSign = args.revenueDelta >= 0 ? '+' : '';

    let alertItems = '';
    if (args.claimedPaylinks > 0)
      alertItems += `<li style="margin-bottom:6px;font-size:14px;color:#475569;">${args.claimedPaylinks} PayLink(s) claimed — awaiting your confirmation</li>`;
    if (args.overdueDebts > 0)
      alertItems += `<li style="margin-bottom:6px;font-size:14px;color:#475569;">${args.overdueDebts} overdue debt(s) need follow-up</li>`;
    if (args.remindersDueToday > 0)
      alertItems += `<li style="margin-bottom:6px;font-size:14px;color:#475569;">${args.remindersDueToday} reminder(s) due today</li>`;
    if (args.brokenPromises && args.brokenPromises > 0)
      alertItems += `<li style="margin-bottom:6px;font-size:14px;color:#475569;">${args.brokenPromises} promise(s) broken — follow up needed</li>`;

    let debtorRows = '';
    for (const d of args.topDebtors.slice(0, 3)) {
      debtorRows += `<tr>
        <td style="padding:6px 0;font-size:13px;color:#475569;">${esc(d.name)}</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1A1A1A;text-align:right;">${naira(d.amount)}</td>
      </tr>`;
    }

    const body = `
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1A1A1A;">Good morning, ${esc(args.name)}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#94A3B8;">${today}</p>

      <div style="background:#F2FBDC;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#64748B;">Today's Revenue</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#1A1A1A;">${naira(args.todayRevenue)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${deltaColor};font-weight:600;">${deltaSign}${args.revenueDelta}% vs yesterday</p>
      </div>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">Outstanding Debts</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#1A1A1A;text-align:right;">${naira(args.totalOwed)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">Business Expenses (yesterday)</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#1A1A1A;text-align:right;">${args.yesterdaySpent ? naira(args.yesterdaySpent) : naira(0)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">Overdue</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:${args.overdueDebts > 0 ? '#DC2626' : '#1A1A1A'};text-align:right;">${args.overdueDebts}</td>
        </tr>
      </table>

      ${args.autoConfirmedToday && args.autoConfirmedToday > 0 ? `
      <div style="background:#ECFDF5;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#065F46;text-transform:uppercase;">Auto-Confirmed Today</p>
        <p style="margin:0;font-size:14px;color:#475569;">
          ${args.autoConfirmedToday} payment${args.autoConfirmedToday > 1 ? 's' : ''} verified automatically — <strong style="color:#065F46;">${naira(args.autoConfirmedAmountToday || 0)}</strong> received.
        </p>
      </div>` : ''}

      ${args.activePromises && args.activePromises > 0 ? `
      <div style="background:#EFF6FF;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1E40AF;text-transform:uppercase;">Promise to Pay</p>
        <p style="margin:0;font-size:14px;color:#475569;">
          ${args.activePromises} active promise${args.activePromises > 1 ? 's' : ''} outstanding.
          ${args.brokenPromises && args.brokenPromises > 0 ? `<span style="color:#DC2626;font-weight:600;">${args.brokenPromises} broken — needs follow-up.</span>` : ''}
        </p>
      </div>` : ''}

      ${alertItems ? `
      <div style="background:#FFF7ED;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#C2410C;text-transform:uppercase;">Needs Your Attention</p>
        <ul style="margin:0;padding-left:18px;">${alertItems}</ul>
      </div>` : ''}

      ${debtorRows ? `
      ${DIVIDER}
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1A1A1A;text-transform:uppercase;">Top Debtors</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${debtorRows}</table>` : ''}

      ${args.suggestions && args.suggestions.length > 0 ? `
      ${DIVIDER}
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1A1A1A;text-transform:uppercase;">Smart Suggestions</p>
      ${args.suggestions.slice(0, 3).map((s) => `
        <p style="margin:0 0 6px;font-size:13px;color:#475569;">${s.emoji} ${esc(s.label)}</p>
      `).join('')}` : ''}

      ${ctaButton('Open Dashboard', appUrl + '/dashboard')}`;

    return send({
      to: args.to,
      subject: `Your Daily Pulse — ${naira(args.todayRevenue)} today`,
      html: layout(body, { preheader: `${naira(args.todayRevenue)} today · ${args.overdueDebts} overdue` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  3. PAYMENT RECEIPT — sent when a customer pays a merchant
   * ══════════════════════════════════════════════════════════════════════ */
  async sendReceipt(args: {
    to: string;
    business: string;
    customerName: string;
    receiptNumber: string;
    amount: number;
    receiptUrl: string;
    pdfBase64?: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';

    const body = `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#00B8E8;">Payment Receipt</div>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1A1A1A;">${esc(args.business)}</h1>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.customerName)}, thank you for your payment of <strong style="color:#1A1A1A;">${naira(args.amount)}</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Receipt #', args.receiptNumber)}
        ${infoRow('Amount', naira(args.amount))}
        ${infoRow('Date', fmtDate(new Date()))}
        ${infoRow('Business', args.business)}
      </table>

      ${ctaButton('View receipt online', appUrl + args.receiptUrl)}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        This receipt was generated by ${esc(args.business)} using ${link(APP_NAME, appUrl)}.
      </p>`;

    return send({
      to: args.to,
      subject: `Receipt from ${args.business} — ${args.receiptNumber}`,
      html: layout(body, { preheader: `Payment of ${naira(args.amount)} received by ${args.business}.` }),
      attachments: args.pdfBase64
        ? [{ filename: `${args.receiptNumber}.pdf`, content: args.pdfBase64 }]
        : undefined,
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  4. TRIAL STARTED — sent when user starts a free trial
   * ══════════════════════════════════════════════════════════════════════ */
  async sendTrialStarted(args: {
    to: string;
    name: string;
    plan: string;
    trialEndsAt: Date;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const endsOn = fmtDate(args.trialEndsAt);

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#FEF3C7;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">🎉</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Your ${esc(args.plan)} trial is live!</h1>
        <p style="margin:0;font-size:14px;color:#475569;">7 days of full access, no payment required.</p>
      </div>

      ${DIVIDER}

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, you now have full access to every <strong>${esc(args.plan)}</strong> feature — unlimited payments, invoices, reports, receipts, and more.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Plan', args.plan)}
        ${infoRow('Trial period', '7 days')}
        ${infoRow('Expires on', endsOn)}
        ${infoRow('Cost', 'Free during trial')}
      </table>

      <p style="margin:20px 0 0;font-size:14px;color:#475569;line-height:1.6;">
        We'll send you a reminder before your trial ends so you can decide whether to upgrade or let it expire. No surprises.
      </p>

      ${ctaButton('Explore your features', appUrl + '/dashboard')}`;

    return send({
      to: args.to,
      subject: `Your ${args.plan} trial is active — ${endsOn}`,
      html: layout(body, { preheader: `7-day free trial of ${args.plan}. Expires ${endsOn}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  5. TRIAL ENDING SOON — sent 3 days before trial expires
   * ══════════════════════════════════════════════════════════════════════ */
  async sendTrialEndingSoon(args: {
    to: string;
    name: string;
    plan: string;
    trialEndsAt: Date;
    daysLeft: number;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const endsOn = fmtDate(args.trialEndsAt);

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#FEF3C7;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">⏰</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Your trial ends in ${args.daysLeft} day${args.daysLeft === 1 ? '' : 's'}</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, your <strong>${esc(args.plan)}</strong> trial expires on <strong>${endsOn}</strong>.
        After that, your account will switch to the Free plan and some features will be limited.
      </p>

      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#92400E;font-weight:600;">
          Upgrade now to keep all your premium features — your data stays safe either way.
        </p>
      </div>

      ${ctaButton('Upgrade now', appUrl + '/settings')}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        Not ready? No worries — you can upgrade anytime later from ${link('Settings', appUrl + '/settings')}.
      </p>`;

    return send({
      to: args.to,
      subject: `Your ${args.plan} trial ends in ${args.daysLeft} day${args.daysLeft === 1 ? '' : 's'}`,
      html: layout(body, { preheader: `${args.daysLeft} days left on your ${args.plan} trial.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  6. TRIAL EXPIRED — sent when trial ends without payment
   * ══════════════════════════════════════════════════════════════════════ */
  async sendTrialExpired(args: {
    to: string;
    name: string;
    plan: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';

    const body = `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#1A1A1A;">Your ${esc(args.plan)} trial has ended</h1>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, your free trial has expired and your account has been switched to the <strong>Free plan</strong>.
        Don't worry — all your data is safe and you can still use CashTraka's core features.
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Ready to unlock everything again? Upgrade anytime and pick up right where you left off.
      </p>

      ${ctaButton('Upgrade your plan', appUrl + '/settings')}`;

    return send({
      to: args.to,
      subject: `Your ${args.plan} trial has ended — upgrade to continue`,
      html: layout(body, { preheader: `Your ${args.plan} trial expired. Upgrade to keep premium features.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  7. PAYMENT SUCCEEDED (subscription) — sent on successful charge
   * ══════════════════════════════════════════════════════════════════════ */
  async sendPaymentSucceeded(args: {
    to: string;
    name: string;
    plan: string;
    amountKobo: number;
    currentPeriodEnd: Date;
    reference?: string;
    businessName?: string;
  }): Promise<SendResult> {
    // Delegate to the richer subscription receipt
    return this.sendSubscriptionReceipt({
      to: args.to,
      name: args.name,
      plan: args.plan,
      amountKobo: args.amountKobo,
      reference: args.reference || 'N/A',
      currentPeriodEnd: args.currentPeriodEnd,
      businessName: args.businessName,
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  8. PAYMENT FAILED — sent when renewal charge fails
   * ══════════════════════════════════════════════════════════════════════ */
  async sendPaymentFailed(args: {
    to: string;
    name: string;
    plan: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#FEE2E2;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">⚠️</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#B91C1C;">Payment failed</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, we weren't able to charge your card for your <strong>${esc(args.plan)}</strong> renewal.
        Your access has been paused until the payment goes through.
      </p>

      <div style="background:#FEF2F2;border-left:4px solid #DC2626;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#991B1B;font-weight:600;">
          Please update your payment method or retry to avoid losing access.
        </p>
      </div>

      ${ctaButton('Retry payment', appUrl + '/settings?billing=retry')}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        If you believe this is an error, ${link('contact support', appUrl + '/contact')}.
      </p>`;

    return send({
      to: args.to,
      subject: `⚠️ ${args.plan} payment failed — action needed`,
      html: layout(body, { preheader: `Your ${args.plan} renewal payment failed. Please retry.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  9. SUBSCRIPTION CANCELLED — confirmation of cancellation
   * ══════════════════════════════════════════════════════════════════════ */
  async sendSubscriptionCancelled(args: {
    to: string;
    name: string;
    plan: string;
    accessUntil: Date | null;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const until = args.accessUntil ? fmtDate(args.accessUntil) : 'now';

    const body = `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#1A1A1A;">Subscription cancelled</h1>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, we've cancelled your <strong>${esc(args.plan)}</strong> subscription as requested.
        You'll keep full access until <strong>${until}</strong>, then your account will switch to the Free plan.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Plan', args.plan)}
        ${infoRow('Status', 'Cancelled')}
        ${infoRow('Access until', until)}
      </table>

      <p style="margin:20px 0 0;font-size:14px;color:#475569;line-height:1.6;">
        Your data stays safe and you can resubscribe anytime. We'd love to have you back.
      </p>

      ${ctaButton('Change your mind?', appUrl + '/settings')}`;

    return send({
      to: args.to,
      subject: `Your ${args.plan} subscription was cancelled`,
      html: layout(body, { preheader: `Your ${args.plan} subscription is cancelled. Access until ${until}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  10. PLAN UPGRADED / CHANGED — sent when plan changes
   * ══════════════════════════════════════════════════════════════════════ */
  async sendPlanChanged(args: {
    to: string;
    name: string;
    oldPlan: string;
    newPlan: string;
    amountKobo?: number;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const amount = args.amountKobo ? naira(Math.round(args.amountKobo / 100)) : null;

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:#ECFDF5;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">🚀</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Plan upgraded!</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, your plan has been changed from <strong>${esc(args.oldPlan)}</strong> to <strong>${esc(args.newPlan)}</strong>.
        ${amount ? ` Your new monthly charge is <strong>${amount}</strong>.` : ''}
      </p>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        All the features of your new plan are available right now. Enjoy!
      </p>

      ${ctaButton('Explore your new features', appUrl + '/dashboard')}`;

    return send({
      to: args.to,
      subject: `You're now on ${args.newPlan}`,
      html: layout(body, { preheader: `Plan changed from ${args.oldPlan} to ${args.newPlan}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  11. INVOICE SENT — notify customer of new invoice
   * ══════════════════════════════════════════════════════════════════════ */
  async sendInvoice(args: {
    to: string;
    customerName: string;
    business: string;
    invoiceNumber: string;
    amount: number;
    dueDate?: Date | null;
    invoiceUrl: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const due = args.dueDate ? fmtDate(args.dueDate) : 'On receipt';

    const body = `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#00B8E8;">Invoice</div>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1A1A1A;">${esc(args.business)}</h1>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.customerName)}, you have a new invoice from <strong>${esc(args.business)}</strong> for <strong style="color:#1A1A1A;">${naira(args.amount)}</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Invoice #', args.invoiceNumber)}
        ${infoRow('Amount', naira(args.amount))}
        ${infoRow('Due date', due)}
        ${infoRow('From', args.business)}
      </table>

      ${ctaButton('View & pay invoice', appUrl + args.invoiceUrl)}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        This invoice was sent by ${esc(args.business)} using ${link(APP_NAME, appUrl)}.
      </p>`;

    return send({
      to: args.to,
      subject: `Invoice from ${args.business} — ${naira(args.amount)}`,
      html: layout(body, { preheader: `New invoice: ${naira(args.amount)} from ${args.business}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  11b. NEGATIVE FEEDBACK ALERT
   *  Sent to the seller the moment a customer submits an Unhappy /
   *  Very Unhappy Service Check rating. Best-effort: never blocks the
   *  public submit response.
   * ══════════════════════════════════════════════════════════════════════ */
  async sendNegativeFeedbackAlert(args: {
    to: string;
    sellerName: string;
    customerName: string;
    rating: 'UNHAPPY' | 'VERY_UNHAPPY';
    reason?: string | null;
    comment?: string | null;
    customerPhoneDisplay?: string | null;
    waLink?: string | null;
    serviceCheckUrl: string;
  }): Promise<SendResult> {
    const ratingLabel =
      args.rating === 'VERY_UNHAPPY' ? 'Very Unhappy' : 'Unhappy';
    const reasonLabel = args.reason
      ? args.reason
          .toLowerCase()
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : null;
    const firstName = (args.sellerName || 'there').split(' ')[0];

    const body = `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#DC2626;">Service Check alert</div>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1A1A1A;">A customer is not happy.</h1>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(firstName)}, ${esc(args.customerName)} just submitted a
        <strong>${esc(ratingLabel)}</strong> rating. Reach out today before they
        go quiet.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;overflow:hidden;">
        ${infoRow('Customer', args.customerName)}
        ${infoRow('Rating', ratingLabel)}
        ${reasonLabel ? infoRow('Reason', reasonLabel) : ''}
        ${args.customerPhoneDisplay ? infoRow('Phone', args.customerPhoneDisplay) : ''}
      </table>

      ${
        args.comment
          ? `<div style="margin-top:16px;padding:14px 16px;background:#F8FAFC;border-left:3px solid #00B8E8;border-radius:6px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:6px;">Their words</div>
              <div style="font-size:14px;color:#1A1A1A;line-height:1.6;font-style:italic;">"${esc(args.comment)}"</div>
            </div>`
          : ''
      }

      <div style="margin-top:24px;text-align:center;">
        ${
          args.waLink
            ? `<a href="${esc(args.waLink)}" style="display:inline-block;background:#25D366;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;font-size:14px;margin-right:8px;">Reply on WhatsApp</a>`
            : ''
        }
        ${ctaButton('See feedback', args.serviceCheckUrl)}
      </div>

      <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
        Customers who feel heard come back. The first 24 hours matter most.
      </p>`;

    return send({
      to: args.to,
      subject: `Service Check: ${args.customerName} is ${ratingLabel}`,
      html: layout(body, {
        preheader: `${args.customerName} just rated their experience as ${ratingLabel}. Follow up today.`,
      }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  12. PASSWORD RESET
   * ══════════════════════════════════════════════════════════════════════ */
  async sendPasswordReset(args: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<SendResult> {
    const body = `
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#00B8E8;">Password Reset</div>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:800;color:#1A1A1A;">Hi ${esc(args.name)},</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Someone requested a password reset for your CashTraka account. Click the button below to choose a new password.
        This link expires in <strong>30 minutes</strong>.
      </p>

      ${ctaButton('Reset my password', args.resetUrl)}

      <p style="margin:0 0 12px;font-size:12px;color:#64748B;">
        If the button doesn't work, paste this link into your browser:<br>
        <span style="word-break:break-all;color:#1A1A1A;font-size:11px;">${esc(args.resetUrl)}</span>
      </p>

      ${DIVIDER}

      <p style="margin:0;font-size:12px;color:#94A3B8;">
        Didn't request this? You can safely ignore this email — your password won't change unless you click the link above.
      </p>`;

    return send({
      to: args.to,
      subject: 'Reset your CashTraka password',
      html: layout(body, { preheader: 'Password reset request for your CashTraka account.' }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  13. RENT REMINDER — sent by cron for landlords
   * ══════════════════════════════════════════════════════════════════════ */
  async sendRentReminder(args: {
    to: string;
    landlordName: string;
    tenantName: string;
    propertyName: string;
    unitLabel: string;
    kind: '30_day_warning' | 'expiry_day' | 'post_expiry' | 'notice_to_quit';
    leaseEnd: Date;
    rentAmount?: number;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const leaseDate = fmtDate(args.leaseEnd);
    const daysAgo = Math.ceil((Date.now() - new Date(args.leaseEnd).getTime()) / (1000 * 60 * 60 * 24));

    const configs: Record<string, { icon: string; bg: string; title: string; message: string; cta: string }> = {
      '30_day_warning': {
        icon: '📅',
        bg: '#FEF3C7',
        title: 'Lease expiring in 30 days',
        message: `<strong>${esc(args.tenantName)}</strong>'s lease at <strong>${esc(args.propertyName)} — ${esc(args.unitLabel)}</strong> expires on <strong>${leaseDate}</strong>. Now is a good time to discuss renewal.`,
        cta: 'View tenant details',
      },
      'expiry_day': {
        icon: '⚠️',
        bg: '#FEF3C7',
        title: 'Lease expires today',
        message: `<strong>${esc(args.tenantName)}</strong>'s lease at <strong>${esc(args.propertyName)} — ${esc(args.unitLabel)}</strong> expires <strong>today</strong>. Take action to renew or begin the exit process.`,
        cta: 'Renew or manage lease',
      },
      'post_expiry': {
        icon: '🔴',
        bg: '#FEE2E2',
        title: `Lease expired ${daysAgo} days ago`,
        message: `<strong>${esc(args.tenantName)}</strong> at <strong>${esc(args.propertyName)} — ${esc(args.unitLabel)}</strong> has been on an expired lease for <strong>${daysAgo} days</strong>. The lease ended on ${leaseDate}.`,
        cta: 'Take action now',
      },
      'notice_to_quit': {
        icon: '🚨',
        bg: '#FEE2E2',
        title: 'Notice to quit recommended',
        message: `<strong>${esc(args.tenantName)}</strong>'s lease at <strong>${esc(args.propertyName)} — ${esc(args.unitLabel)}</strong> expired over 60 days ago (${leaseDate}). Consider issuing a formal notice.`,
        cta: 'Review tenant',
      },
    };

    const cfg = configs[args.kind] || configs['30_day_warning'];

    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:${cfg.bg};border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">${cfg.icon}</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">${cfg.title}</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.landlordName)}, ${cfg.message}
      </p>

      ${args.rentAmount ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Tenant', args.tenantName)}
        ${infoRow('Property', args.propertyName + ' — ' + args.unitLabel)}
        ${infoRow('Monthly rent', naira(args.rentAmount))}
        ${infoRow('Lease end', leaseDate)}
      </table>` : ''}

      ${ctaButton(cfg.cta, appUrl + '/rent')}`;

    return send({
      to: args.to,
      subject: `🏠 ${cfg.title} — ${args.tenantName}`,
      html: layout(body, { preheader: `${cfg.title}: ${args.tenantName} at ${args.propertyName}.` }),
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
   *  14. WEEKLY SUMMARY — digest of activity
   * ══════════════════════════════════════════════════════════════════════ */
  async sendWeeklySummary(args: {
    to: string;
    name: string;
    totalRevenue: number;
    paymentsCount: number;
    newCustomers: number;
    outstandingDebt: number;
    weekLabel: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';

    const body = `
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Your weekly summary</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#94A3B8;">${esc(args.weekLabel)}</p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Revenue', naira(args.totalRevenue))}
        ${infoRow('Payments', String(args.paymentsCount))}
        ${infoRow('New customers', String(args.newCustomers))}
        ${infoRow('Outstanding debt', naira(args.outstandingDebt))}
      </table>

      <p style="margin:20px 0 0;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.name)}, here's what happened in your business this week. Keep the momentum going!
      </p>

      ${ctaButton('View full reports', appUrl + '/reports')}`;

    return send({
      to: args.to,
      subject: `Weekly summary: ${naira(args.totalRevenue)} revenue · ${args.paymentsCount} payments`,
      html: layout(body, { preheader: `${naira(args.totalRevenue)} revenue, ${args.paymentsCount} payments this week.` }),
    });
  },

  /** Low-level escape hatch so other services can send arbitrary transactional mail. */

  /* ══════════════════════════════════════════════════════════════════════
   *  15. DELAYED WELCOME — sent 30 min after signup (warm onboarding)
   * ══════════════════════════════════════════════════════════════════════ */
  async sendDelayedWelcome(args: {
    to: string;
    name: string;
    businessType?: string;
    businessName?: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.vercel.app';
    const firstName = args.name.split(' ')[0];
    const isPM = args.businessType === 'property_manager';

    const heroEmoji = isPM ? '🏠' : '💰';
    const heroSubtitle = isPM
      ? 'Your property management just got easier.'
      : 'Your business finances just got clearer.';

    const featureCards = isPM
      ? [
          {
            icon: '🏢',
            title: 'Property Dashboard',
            desc: 'See all your buildings, units, and occupancy at a glance.',
          },
          {
            icon: '🔔',
            title: 'Automatic Rent Reminders',
            desc: 'CashTraka sends reminders before lease expiry — so you never miss a renewal.',
          },
          {
            icon: '📊',
            title: 'Financial Reports',
            desc: 'Track rent income, expenses, and profitability per property.',
          },
        ]
      : [
          {
            icon: '📱',
            title: 'Record Sales Instantly',
            desc: 'Log payments in seconds and see your revenue grow in real time.',
          },
          {
            icon: '📧',
            title: 'Send Receipts in One Tap',
            desc: 'Professional receipts via WhatsApp or email — your customers will love it.',
          },
          {
            icon: '📈',
            title: 'Know Your Numbers',
            desc: 'Real profit, not just revenue. Track expenses, debts, and growth trends.',
          },
        ];

    let featureHTML = '';
    for (const f of featureCards) {
      featureHTML += `
      <tr>
        <td style="padding:12px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="48" style="vertical-align:top;">
                <div style="width:44px;height:44px;background:#F2FBDC;border-radius:12px;text-align:center;line-height:44px;font-size:22px;">${f.icon}</div>
              </td>
              <td style="padding-left:14px;vertical-align:top;">
                <div style="font-size:15px;font-weight:700;color:#1A1A1A;margin-bottom:2px;">${esc(f.title)}</div>
                <div style="font-size:13px;color:#64748B;line-height:1.5;">${esc(f.desc)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    }

    const body = `
      <!-- Hero section with warm gradient feel -->
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;line-height:1;margin-bottom:12px;">${heroEmoji}</div>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#1A1A1A;line-height:1.2;">
          Hey ${esc(firstName)}, welcome aboard!
        </h1>
        <p style="margin:0;font-size:15px;color:#64748B;line-height:1.5;">
          ${heroSubtitle}
        </p>
      </div>

      ${DIVIDER}

      <!-- Personal note from the team -->
      <div style="background:linear-gradient(135deg,#F2FBDC 0%,#E6F8FD 100%);background-color:#F2FBDC;border-radius:14px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.7;">
          We built CashTraka because ${isPM
            ? "managing properties in Nigeria shouldn't mean drowning in spreadsheets and chasing tenants for rent."
            : "too many Nigerian business owners work hard every day but can't tell you their real profit at the end of the month."
          }
        </p>
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
          ${isPM
            ? 'With CashTraka, you get a purpose-built system that tracks every unit, every tenant, every payment — and reminds you before things slip through the cracks.'
            : 'CashTraka gives you one place to record sales, track who owes you, manage expenses, and see exactly where your money goes. No accounting degree needed.'
          }
        </p>
      </div>

      <!-- Feature highlights -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#00B8E8;margin-bottom:12px;">What you can do right now</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          ${featureHTML}
        </table>
      </div>

      ${ctaButton('Open your dashboard', appUrl + '/dashboard')}

      ${DIVIDER}

      <!-- Social proof / trust signal -->
      <div style="text-align:center;padding:16px 0 8px;">
        <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#1A1A1A;">Join hundreds of Nigerian businesses</p>
        <p style="margin:0;font-size:13px;color:#94A3B8;">
          ${isPM ? 'Property managers across Lagos, Abuja, and Port Harcourt trust CashTraka.' : 'From market sellers to tech startups — CashTraka works for every business size.'}
        </p>
      </div>

      ${DIVIDER}

      <!-- Quick help section -->
      <div style="background:#F8FAFC;border-radius:12px;padding:20px;margin-top:8px;">
        <div style="font-size:13px;font-weight:700;color:#1A1A1A;margin-bottom:10px;">Need help getting started?</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:4px 0;font-size:13px;">
              ${link('Visit our help center', appUrl + '/contact')}
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;">
              Just reply to this email — a real human will respond
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:24px 0 0;font-size:14px;color:#475569;text-align:center;line-height:1.6;">
        We're rooting for your success. 🙌<br>
        <strong style="color:#1A1A1A;">— The CashTraka Team</strong>
      </p>`;

    return send({
      to: args.to,
      subject: isPM
        ? `${firstName}, your property management toolkit is ready`
        : `${firstName}, your business dashboard is ready`,
      html: layout(body, {
        preheader: isPM
          ? 'Properties, tenants, rent tracking — all set up and waiting for you.'
          : 'Payments, receipts, expenses — everything you need to run your business smarter.',
      }),
    });
  },

  /** #16 — PayLink email: send payment request link to customer via email */
  async sendPayLink(args: {
    to: string;
    customerName: string;
    amount: number;
    businessName: string;
    description?: string;
    payUrl: string;
    linkNumber: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const firstName = args.customerName.split(' ')[0];
    const desc = args.description ? `<p style="margin:8px 0 0;font-size:14px;color:#64748B;">For: ${esc(args.description)}</p>` : '';

    const body = `
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#1A1A1A;line-height:1.3;">
        Hi ${esc(firstName)}, you have a payment request
      </h1>
      <p style="margin:12px 0 0;font-size:15px;color:#475569;line-height:1.6;">
        <strong style="color:#1A1A1A;">${esc(args.businessName)}</strong> has sent you a payment request.
      </p>

      <!-- Amount card -->
      <div style="background:#F2FBDC;border:1px solid #CFEF83;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <div style="font-size:12px;font-weight:600;color:#588A10;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Amount Due</div>
        <div style="font-size:32px;font-weight:800;color:#166534;">${naira(args.amount)}</div>
        ${desc}
        <div style="margin-top:8px;font-size:12px;color:#64748B;">Ref: ${esc(args.linkNumber)}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        ${ctaButton('View Payment Details', args.payUrl)}
      </div>

      <p style="margin:16px 0 0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.5;">
        Click the button above to view payment details and confirm once paid.
      </p>

      <div style="border-top:1px solid #E2E8F0;margin:24px 0 16px;"></div>

      <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">
        This payment request was sent via ${link('CashTraka', appUrl)}.
        If you did not expect this, you can safely ignore this email.
      </p>`;

    return send({
      to: args.to,
      subject: `Payment request of ${naira(args.amount)} from ${args.businessName}`,
      html: layout(body, {
        preheader: `${args.businessName} is requesting ${naira(args.amount)} from you.`,
      }),
    });
  },

  async sendStaffInvite(args: {
    to: string;
    name: string;
    role: string;
    inviteUrl: string;
    invitedBy: string;
  }): Promise<SendResult> {
    const roleLabel = args.role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const body = `
      <h2 style="margin:0 0 8px;font-size:22px;color:#1A1A1A;">
        You're invited to join CashTraka
      </h2>

      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi ${args.name},
      </p>

      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        <strong>${args.invitedBy}</strong> has invited you to join the CashTraka
        platform as a <strong>${roleLabel}</strong>.
      </p>

      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
        Click the button below to set your password and activate your account.
        This link expires in 7 days.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${args.inviteUrl}"
           style="display:inline-block;background:#8BD91E;color:#1A1A1A;font-weight:700;
                  font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Accept Invitation
        </a>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${args.inviteUrl}" style="color:#00B8E8;word-break:break-all;">
          ${args.inviteUrl}
        </a>
      </p>`;

    return send({
      to: args.to,
      subject: `You're invited to CashTraka as ${roleLabel}`,
      html: layout(body, {
        preheader: `${args.invitedBy} invited you to join CashTraka as ${roleLabel}.`,
      }),
    });
  },

  /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   *  19. PAYMENT REMINDER \u2014 sent by auto follow-up cron
   * \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
  async sendPaymentReminder(args: {
    to: string;
    customerName: string;
    businessName: string;
    amount: number;
    tone: 'gentle' | 'firm' | 'final';
    payLink?: string;
  }): Promise<SendResult> {
    const appUrl = process.env.APP_URL || 'https://cashtraka.co';
    const toneConfig = {
      gentle: {
        icon: '💬',
        bg: '#F2FBDC',
        subject: `Friendly reminder: ${naira(args.amount)} outstanding`,
        greeting: `This is a friendly reminder that you have an outstanding balance of <strong>${naira(args.amount)}</strong> with <strong>${esc(args.businessName)}</strong>.`,
        cta: 'Make Payment',
      },
      firm: {
        icon: '⚠️',
        bg: '#FEF3C7',
        subject: `Payment overdue: ${naira(args.amount)} owed to ${args.businessName}`,
        greeting: `Your payment of <strong>${naira(args.amount)}</strong> to <strong>${esc(args.businessName)}</strong> is now overdue. Please settle this balance as soon as possible.`,
        cta: 'Pay Now',
      },
      final: {
        icon: '🔴',
        bg: '#FEE2E2',
        subject: `Final notice: ${naira(args.amount)} \u2014 ${args.businessName}`,
        greeting: `This is a final reminder regarding your outstanding balance of <strong>${naira(args.amount)}</strong> with <strong>${esc(args.businessName)}</strong>. Please make payment immediately to avoid further action.`,
        cta: 'Pay Immediately',
      },
    };

    const cfg = toneConfig[args.tone];
    const body = `
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:${cfg.bg};border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;font-size:28px;">${cfg.icon}</div>
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#1A1A1A;">Payment Reminder</h1>
      </div>

      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${esc(args.customerName)}, ${cfg.greeting}
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;overflow:hidden;">
        ${infoRow('Amount Due', naira(args.amount))}
        ${infoRow('Business', args.businessName)}
      </table>

      ${args.payLink ? ctaButton(cfg.cta, args.payLink) : ctaButton('View Details', appUrl)}

      <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
        This reminder was sent on behalf of ${esc(args.businessName)} via CashTraka.
      </p>`;

    return send({
      to: args.to,
      subject: cfg.subject,
      html: layout(body, { preheader: cfg.greeting.replace(/<[^>]+>/g, '') }),
    });
  },

  raw: send,
};
