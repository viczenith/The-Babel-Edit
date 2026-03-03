/**
 * Email service using SendGrid v3 HTTP API (not SMTP).
 * Uses native fetch — no extra dependencies needed.
 * SMTP (port 587) is often blocked on platforms like Render;
 * the HTTP API uses HTTPS (port 443) and is always reachable.
 */

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Parse an EMAIL_FROM value like "The Babel Edit <noreply@thebabeledit.com>"
 * into { email, name } for the SendGrid API.
 */
function parseFrom(fromStr) {
  const match = fromStr.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { email: fromStr.trim() };
}

/**
 * Verifies the email service is correctly configured.
 * Call on server startup to catch config issues early.
 */
export const verifyEmailTransport = async () => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    console.error('⚠️  Email service NOT configured. Missing env vars:',
      !process.env.SENDGRID_API_KEY ? 'SENDGRID_API_KEY' : '',
      !process.env.EMAIL_FROM ? 'EMAIL_FROM' : ''
    );
    return false;
  }

  // Quick API key validation — hit the SendGrid scopes endpoint
  try {
    const res = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      console.log('✅ Email service verified — SendGrid API key is valid');
      return true;
    }
    const body = await res.text();
    console.error(`❌ SendGrid API key check failed (${res.status}):`, body);
    return false;
  } catch (error) {
    console.error('❌ SendGrid API key verification error:', error.message);
    return false;
  }
};

/**
 * Sends an email via the SendGrid v3 HTTP API.
 * @param {object} options
 * @param {string} options.to      - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html    - HTML body
 * @param {string} [options.text]  - Plain-text body (optional)
 * @returns {Promise<boolean>} true if accepted (202), false otherwise
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    console.error('📧 Email NOT sent — service not configured. Missing:',
      !process.env.SENDGRID_API_KEY ? 'SENDGRID_API_KEY' : '',
      !process.env.EMAIL_FROM ? 'EMAIL_FROM' : '',
      `| Recipient: ${to} | Subject: ${subject}`
    );
    return false;
  }

  const from = parseFrom(process.env.EMAIL_FROM);

  const content = [];
  if (text) content.push({ type: 'text/plain', value: text });
  if (html) content.push({ type: 'text/html', value: html });
  if (content.length === 0) content.push({ type: 'text/plain', value: subject });

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from,
    subject,
    content,
  };

  try {
    const res = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000), // 15 s hard timeout
    });

    if (res.status === 202) {
      console.log(`📧 Email sent successfully to ${to} (202 Accepted)`);
      return true;
    }

    // Non-202 — read error body for diagnostics
    const errBody = await res.text();
    console.error(`❌ Email FAILED to ${to} | Subject: ${subject} | Status: ${res.status} | Body: ${errBody}`);
    return false;
  } catch (error) {
    console.error(`❌ Email FAILED to ${to} | Subject: ${subject} | Error: ${error.message}`);
    return false;
  }
};
