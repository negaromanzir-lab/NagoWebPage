/**
 * emailService.js
 *
 * Centralised email notification service using Nodemailer.
 *
 * Configuration (add to server/.env):
 *   EMAIL_HOST        — SMTP host (e.g. smtp.gmail.com)
 *   EMAIL_PORT        — SMTP port (e.g. 587)
 *   EMAIL_SECURE      — 'true' for port 465, 'false' for STARTTLS
 *   EMAIL_USER        — SMTP username / sender address
 *   EMAIL_PASS        — SMTP password or app password
 *   EMAIL_FROM_NAME   — Display name (default: NagoWeb)
 *   EMAIL_FROM_ADDR   — From address (defaults to EMAIL_USER)
 *   CLIENT_URL        — Frontend base URL for links in emails
 *
 * If EMAIL_HOST is not set the service runs in "preview" mode:
 * it logs the email to the console instead of sending it.
 */

const nodemailer = require('nodemailer');

// ── Transport ──────────────────────────────────────────────────────────────────

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_HOST) {
    // Preview / development mode — log to console
    _transporter = {
      sendMail: async (opts) => {
        console.log('\n📧  [EmailService] PREVIEW MODE — email not sent');
        console.log('   To     :', opts.to);
        console.log('   Subject:', opts.subject);
        console.log('   Text   :', (opts.text || '').slice(0, 200));
        return { messageId: 'preview-' + Date.now() };
      },
    };
    return _transporter;
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return _transporter;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const FROM = () =>
  `"${process.env.EMAIL_FROM_NAME || 'NagoWeb'}" <${process.env.EMAIL_FROM_ADDR || process.env.EMAIL_USER || 'noreply@nagoweb.com'}>`;

const CLIENT = () => process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Core send helper — wraps transporter.sendMail with error logging.
 * Never throws; returns true on success, false on failure.
 */
async function send({ to, subject, html, text }) {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: FROM(),
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
    console.log(`📧  Email sent to ${to} — ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('📧  Email send failed:', err.message);
    return false;
  }
}

// ── Shared HTML layout ─────────────────────────────────────────────────────────

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#e2e8f0; }
    .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
    .card { background:#1e293b; border:1px solid #334155; border-radius:16px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#0891b2,#2563eb); padding:32px; text-align:center; }
    .header h1 { margin:0; font-size:22px; font-weight:700; color:#fff; letter-spacing:-0.5px; }
    .header p  { margin:8px 0 0; font-size:13px; color:rgba(255,255,255,0.75); }
    .body { padding:32px; }
    .body p { margin:0 0 16px; font-size:14px; line-height:1.6; color:#cbd5e1; }
    .body h2 { margin:0 0 12px; font-size:16px; font-weight:600; color:#f1f5f9; }
    .btn { display:inline-block; background:#0891b2; color:#fff !important; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:10px; margin:8px 0; }
    .btn-success { background:#16a34a; }
    .btn-danger  { background:#dc2626; }
    .info-box { background:#0f172a; border:1px solid #334155; border-radius:10px; padding:16px; margin:16px 0; }
    .info-box p { margin:4px 0; font-size:13px; }
    .info-box .label { color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
    .info-box .value { color:#f1f5f9; font-weight:500; }
    .divider { border:none; border-top:1px solid #334155; margin:24px 0; }
    .footer { padding:20px 32px; text-align:center; }
    .footer p { margin:0; font-size:12px; color:#475569; }
    .footer a { color:#0891b2; text-decoration:none; }
    .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; }
    .badge-green  { background:#14532d; color:#4ade80; }
    .badge-red    { background:#450a0a; color:#f87171; }
    .badge-yellow { background:#422006; color:#fbbf24; }
    .badge-blue   { background:#1e3a5f; color:#60a5fa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>🌐 NagoWeb</h1>
        <p>Network Design Marketplace</p>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} NagoWeb · <a href="${CLIENT()}">Visit our site</a></p>
        <p style="margin-top:6px;">You received this email because you have an account on NagoWeb.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 1. Welcome / Registration ──────────────────────────────────────────────────

/**
 * Send a welcome email after successful registration.
 * @param {{ name: string, email: string }} user
 */
async function sendWelcome({ name, email }) {
  const subject = 'Welcome to NagoWeb 🎉';
  const html = layout(subject, `
    <h2>Welcome aboard, ${name}!</h2>
    <p>Your NagoWeb account has been created successfully. You can now browse and purchase professional network design projects.</p>
    <div class="info-box">
      <p><span class="label">Account email</span></p>
      <p><span class="value">${email}</span></p>
    </div>
    <p>Ready to explore?</p>
    <a href="${CLIENT()}" class="btn">Browse Projects</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">If you didn't create this account, please ignore this email.</p>
  `);
  return send({ to: email, subject, html });
}

// ── 2. Order Confirmation ──────────────────────────────────────────────────────

/**
 * Send an order confirmation email after a successful purchase.
 * @param {{ name: string, email: string }} user
 * @param {{ id: string, totalAmount: number, items: Array<{title:string, price:number}> }} order
 */
async function sendOrderConfirmation({ user, order }) {
  const subject = `Order Confirmed — #${order.id.slice(0, 8).toUpperCase()}`;
  const itemRows = (order.items || [])
    .map((i) => `<p><span class="value">• ${i.title}</span> <span style="color:#64748b;">— $${parseFloat(i.price).toFixed(2)}</span></p>`)
    .join('');

  const html = layout(subject, `
    <h2>Your order is confirmed ✅</h2>
    <p>Thank you for your purchase, <strong>${user.name}</strong>! Your payment has been processed successfully.</p>
    <div class="info-box">
      <p><span class="label">Order ID</span></p>
      <p><span class="value">#${order.id.slice(0, 8).toUpperCase()}</span></p>
      <p style="margin-top:12px;"><span class="label">Items purchased</span></p>
      ${itemRows}
      <p style="margin-top:12px;"><span class="label">Total</span></p>
      <p><span class="value" style="font-size:18px;">$${parseFloat(order.totalAmount).toFixed(2)}</span></p>
    </div>
    <p>Your download links are now available in your dashboard.</p>
    <a href="${CLIENT()}/dashboard/projects" class="btn btn-success">Go to My Projects</a>
  `);
  return send({ to: user.email, subject, html });
}

// ── 3. Manual Payment — Proof Received ────────────────────────────────────────

/**
 * Notify buyer that their payment proof was received and is under review.
 * @param {{ name: string, email: string }} user
 * @param {{ id: string, totalAmount: number, paymentMethod: string }} order
 */
async function sendPaymentProofReceived({ user, order }) {
  const subject = 'Payment Proof Received — Under Review';
  const methodLabel = { telebirr: 'Telebirr', cbe_birr: 'CBE Birr', bank_transfer: 'Bank Transfer' }[order.paymentMethod] || order.paymentMethod;

  const html = layout(subject, `
    <h2>We received your payment proof 📋</h2>
    <p>Hi <strong>${user.name}</strong>, your payment screenshot has been submitted and is currently under review by our team.</p>
    <div class="info-box">
      <p><span class="label">Order ID</span></p>
      <p><span class="value">#${order.id.slice(0, 8).toUpperCase()}</span></p>
      <p style="margin-top:8px;"><span class="label">Payment method</span></p>
      <p><span class="value">${methodLabel}</span></p>
      <p style="margin-top:8px;"><span class="label">Amount</span></p>
      <p><span class="value">$${parseFloat(order.totalAmount).toFixed(2)}</span></p>
      <p style="margin-top:8px;"><span class="label">Status</span></p>
      <p><span class="badge badge-yellow">Under Review</span></p>
    </div>
    <p>We typically review payments within <strong>1–2 business hours</strong>. You'll receive another email once your payment is approved.</p>
    <a href="${CLIENT()}/dashboard/payments" class="btn">View Order Status</a>
  `);
  return send({ to: user.email, subject, html });
}

// ── 4. Manual Payment — Approved ──────────────────────────────────────────────

/**
 * Notify buyer that their manual payment was approved.
 * @param {{ name: string, email: string }} user
 * @param {{ id: string, totalAmount: number, items: Array<{title:string}> }} order
 */
async function sendPaymentApproved({ user, order }) {
  const subject = '🎉 Payment Approved — Download Your Projects';
  const itemList = (order.items || [])
    .map((i) => `<p><span class="value">• ${i.title}</span></p>`)
    .join('');

  const html = layout(subject, `
    <h2>Payment approved! 🎉</h2>
    <p>Great news, <strong>${user.name}</strong>! Your payment has been verified and your projects are now ready to download.</p>
    <div class="info-box">
      <p><span class="label">Order ID</span></p>
      <p><span class="value">#${order.id.slice(0, 8).toUpperCase()}</span></p>
      <p style="margin-top:8px;"><span class="label">Projects unlocked</span></p>
      ${itemList}
      <p style="margin-top:8px;"><span class="label">Status</span></p>
      <p><span class="badge badge-green">Approved</span></p>
    </div>
    <p>Head to your dashboard to generate your secure download links.</p>
    <a href="${CLIENT()}/dashboard/projects" class="btn btn-success">Download Now</a>
  `);
  return send({ to: user.email, subject, html });
}

// ── 5. Manual Payment — Rejected ──────────────────────────────────────────────

/**
 * Notify buyer that their manual payment was rejected.
 * @param {{ name: string, email: string }} user
 * @param {{ id: string, adminNote: string }} order
 */
async function sendPaymentRejected({ user, order }) {
  const subject = 'Payment Proof Rejected — Action Required';
  const html = layout(subject, `
    <h2>Payment verification failed ❌</h2>
    <p>Hi <strong>${user.name}</strong>, unfortunately we were unable to verify your payment for order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong>.</p>
    ${order.adminNote ? `
    <div class="info-box">
      <p><span class="label">Reason</span></p>
      <p><span class="value">${order.adminNote}</span></p>
    </div>` : ''}
    <p>Please re-submit your payment proof with a clear screenshot showing the transaction confirmation. If you believe this is an error, please contact our support team.</p>
    <a href="${CLIENT()}/pay" class="btn btn-danger">Re-submit Payment</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">Need help? Reply to this email or contact us through the website.</p>
  `);
  return send({ to: user.email, subject, html });
}

// ── 6. Download Link Generated ────────────────────────────────────────────────

/**
 * Notify user that a new download link has been generated.
 * @param {{ name: string, email: string }} user
 * @param {{ projectTitle: string, expiresAt: Date, maxUses: number, downloadUrl: string }} tokenInfo
 */
async function sendDownloadLinkReady({ user, tokenInfo }) {
  const subject = `Download Link Ready — ${tokenInfo.projectTitle}`;
  const expiresStr = new Date(tokenInfo.expiresAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const html = layout(subject, `
    <h2>Your download link is ready ⬇️</h2>
    <p>Hi <strong>${user.name}</strong>, a secure download link has been generated for your project.</p>
    <div class="info-box">
      <p><span class="label">Project</span></p>
      <p><span class="value">${tokenInfo.projectTitle}</span></p>
      <p style="margin-top:8px;"><span class="label">Expires</span></p>
      <p><span class="value">${expiresStr}</span></p>
      <p style="margin-top:8px;"><span class="label">Max uses</span></p>
      <p><span class="value">${tokenInfo.maxUses} download${tokenInfo.maxUses !== 1 ? 's' : ''}</span></p>
    </div>
    <p>Click the button below to download your file. This link is single-use and expires in 24 hours.</p>
    <a href="${tokenInfo.downloadUrl}" class="btn">Download File</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">If you didn't request this download link, please contact us immediately.</p>
  `);
  return send({ to: user.email, subject, html });
}

// ── 7. Password Changed ────────────────────────────────────────────────────────

/**
 * Security notification when a user changes their password.
 * @param {{ name: string, email: string }} user
 */
async function sendPasswordChanged({ name, email }) {
  const subject = 'Your password has been changed';
  const html = layout(subject, `
    <h2>Password changed successfully 🔐</h2>
    <p>Hi <strong>${name}</strong>, your NagoWeb account password was changed on <strong>${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</strong>.</p>
    <p>If you made this change, no further action is needed.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;">If you did <strong>not</strong> change your password, your account may be compromised. Please <a href="${CLIENT()}/login" style="color:#0891b2;">log in immediately</a> and change your password, or contact our support team.</p>
  `);
  return send({ to: email, subject, html });
}

// ── 8. Account Status Changed (admin action) ──────────────────────────────────

/**
 * Notify user when an admin activates or deactivates their account.
 * @param {{ name: string, email: string }} user
 * @param {boolean} isActive
 */
async function sendAccountStatusChanged({ name, email }, isActive) {
  const subject = isActive ? 'Your account has been reactivated' : 'Your account has been deactivated';
  const html = layout(subject, `
    <h2>${isActive ? 'Account reactivated ✅' : 'Account deactivated ⚠️'}</h2>
    <p>Hi <strong>${name}</strong>, your NagoWeb account has been <strong>${isActive ? 'reactivated' : 'deactivated'}</strong> by an administrator.</p>
    ${isActive
      ? `<p>You can now log in and access all your projects and downloads.</p><a href="${CLIENT()}/login" class="btn btn-success">Log In</a>`
      : `<p>You will not be able to log in until your account is reactivated. If you believe this is a mistake, please contact our support team.</p>`
    }
  `);
  return send({ to: email, subject, html });
}

// ── 9. Admin: New Payment Proof Alert ────────────────────────────────────────

/**
 * Notify the admin when a buyer submits a manual payment proof.
 * @param {{ buyerName: string, buyerEmail: string, method: string, amountPaid: number, currency: string, orderId: string, proofId: number }} info
 */
async function sendAdminNewPaymentProof({ buyerName, buyerEmail, method, amountPaid, currency, orderId, proofId }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return; // no admin email configured — skip silently

  const methodLabel = { telebirr: 'Telebirr', cbe_birr: 'CBE Birr', bank_transfer: 'Bank Transfer' }[method] || method;
  const subject = `🔔 New Payment Proof — ${buyerName} (${methodLabel})`;

  const html = layout(subject, `
    <h2>New payment proof submitted 🔔</h2>
    <p>A buyer has uploaded a payment screenshot and is waiting for your review.</p>
    <div class="info-box">
      <p><span class="label">Buyer</span></p>
      <p><span class="value">${buyerName}</span> <span style="color:#64748b;">(${buyerEmail})</span></p>
      <p style="margin-top:8px;"><span class="label">Payment Method</span></p>
      <p><span class="value">${methodLabel}</span></p>
      <p style="margin-top:8px;"><span class="label">Amount Paid</span></p>
      <p><span class="value">${Number(amountPaid).toLocaleString()} ${currency}</span></p>
      <p style="margin-top:8px;"><span class="label">Order ID</span></p>
      <p><span class="value" style="font-family:monospace;font-size:12px;">#${orderId.slice(0, 8).toUpperCase()}</span></p>
      <p style="margin-top:8px;"><span class="label">Status</span></p>
      <p><span class="badge badge-yellow">Pending Review</span></p>
    </div>
    <p>Please review this payment as soon as possible to keep the buyer waiting.</p>
    <a href="${CLIENT()}/admin/manual-payments" class="btn">Review in Admin Panel</a>
  `);
  return send({ to: adminEmail, subject, html });
}

// ── 10. New Project Published (seller notification) ────────────────────────────

/**
 * Notify a seller when their project is published by an admin.
 * @param {{ name: string, email: string }} seller
 * @param {{ id: number, title: string }} project
 */
async function sendProjectPublished({ seller, project }) {
  const subject = `Your project is live — ${project.title}`;
  const html = layout(subject, `
    <h2>Your project is now live! 🚀</h2>
    <p>Hi <strong>${seller.name}</strong>, your project has been reviewed and published on NagoWeb.</p>
    <div class="info-box">
      <p><span class="label">Project</span></p>
      <p><span class="value">${project.title}</span></p>
      <p style="margin-top:8px;"><span class="label">Status</span></p>
      <p><span class="badge badge-green">Published</span></p>
    </div>
    <p>Buyers can now discover and purchase your project.</p>
    <a href="${CLIENT()}" class="btn">View Marketplace</a>
  `);
  return send({ to: seller.email, subject, html });
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  sendWelcome,
  sendOrderConfirmation,
  sendPaymentProofReceived,
  sendPaymentApproved,
  sendPaymentRejected,
  sendAdminNewPaymentProof,
  sendDownloadLinkReady,
  sendPasswordChanged,
  sendAccountStatusChanged,
  sendProjectPublished,
};
