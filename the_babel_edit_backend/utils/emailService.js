import nodemailer from 'nodemailer';

// Lazy transporter — created on first use so env vars from dotenv are loaded
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SENDGRID_API_KEY) {
    console.error('⚠️  SENDGRID_API_KEY is not set — email transport cannot be created.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'apikey', // This is a literal string 'apikey' for SendGrid
      pass: process.env.SENDGRID_API_KEY,
    },
  });

  console.log('📧 Email transporter created (SendGrid SMTP)');
  return transporter;
}

/**
 * Verifies the email transport is correctly configured.
 * Call this on server startup to catch config issues early.
 */
export const verifyEmailTransport = async () => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    console.error('⚠️  Email service NOT configured. Missing env vars:',
      !process.env.SENDGRID_API_KEY ? 'SENDGRID_API_KEY' : '',
      !process.env.EMAIL_FROM ? 'EMAIL_FROM' : ''
    );
    return false;
  }

  const t = getTransporter();
  if (!t) return false;

  try {
    await t.verify();
    console.log('✅ Email transport verified — SendGrid SMTP ready');
    return true;
  } catch (error) {
    console.error('❌ Email transport verification FAILED:', error.message);
    return false;
  }
};

/**
 * Sends an email using the configured Nodemailer transport.
 * @param {object} options - The email options.
 * @param {string} options.to - The recipient's email address.
 * @param {string} options.subject - The email subject.
 * @param {string} options.html - The HTML body of the email.
 * @param {string} [options.text] - The plain text body of the email (optional).
 * @returns {Promise<boolean>} true if sent, false if failed/not configured
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

  const t = getTransporter();
  if (!t) {
    console.error(`📧 Email NOT sent — transporter unavailable | To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Email FAILED to ${to} | Subject: ${subject} | Error: ${error.message}`);
    if (error.response) {
      console.error(`   SMTP Response: ${error.response}`);
    }
    return false;
  }
};
