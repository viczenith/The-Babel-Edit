import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'apikey', // This is a literal string 'apikey' for SendGrid
    pass: process.env.SENDGRID_API_KEY,
  },
});

/**
 * Sends an email using the configured Nodemailer transport.
 * @param {object} options - The email options.
 * @param {string} options.to - The recipient's email address.
 * @param {string} options.subject - The email subject.
 * @param {string} options.html - The HTML body of the email.
 * @param {string} [options.text] - The plain text body of the email (optional).
 * @returns {Promise<void>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
    console.error('Email service is not configured. Please set SENDGRID_API_KEY and EMAIL_FROM in your .env file.');
    // In a real app, you might want to throw an error or handle this more gracefully.
    // For now, we'll just log the error and prevent the app from crashing during development.
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Depending on the importance, you might want to add retry logic or a more robust logging/alerting mechanism here.
  }
};
