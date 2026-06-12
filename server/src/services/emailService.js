import nodemailer from 'nodemailer';
import { getActiveEmailSettings } from './emailSettingsService.js';

const getEnvEmailSettings = () => {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) return null;

  return {
    smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtp_port: parseInt(process.env.SMTP_PORT || '587', 10),
    smtp_secure: process.env.SMTP_SECURE === 'true',
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    from_email: process.env.SMTP_FROM || smtpUser,
    from_name: process.env.SMTP_FROM_NAME || '',
  };
};

const getEmailSettingsForTransport = async () => {
  try {
    return await getActiveEmailSettings();
  } catch (error) {
    const fallback = getEnvEmailSettings();
    if (process.env.NODE_ENV !== 'production' && fallback) {
      console.warn('[EmailService] Using SMTP_* environment fallback for local email delivery.');
      return fallback;
    }

    throw error;
  }
};

const formatFromAddress = (email, name) => {
  if (!name) return email;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
};

// Create reusable transporter object using SMTP transport
const createTransporter = async () => {
  const settings = await getEmailSettingsForTransport();

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure, // true for 465, false for 587/STARTTLS
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });

  return { transporter, settings };
};

export const sendEmail = async (to, subject, text, html = null) => {
  try {
    const { transporter, settings } = await createTransporter();
    
    // Verify connection before sending
    try {
      await transporter.verify();
      console.log('[EmailService] SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('[EmailService] SMTP verification failed:', verifyError.message);
      if (verifyError.message.includes('Invalid login') || verifyError.message.includes('BadCredentials') || verifyError.message.includes('Username and Password not accepted')) {
        throw new Error('Email authentication failed. Check the SMTP username and password. Some providers allow the mailbox password, while Gmail usually requires an App Password.');
      }
      throw verifyError;
    }
    
    const mailOptions = {
      from: formatFromAddress(settings.from_email || settings.smtp_user, settings.from_name),
      to: to,
      subject: subject,
      text: text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Provide helpful error messages
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials') || error.message.includes('Username and Password not accepted')) {
      throw new Error('Email authentication failed. Check the SMTP username and password. Some providers allow the mailbox password, while Gmail usually requires an App Password.');
    }
    
    throw error;
  }
};

export const sendTestEmail = async (to) => {
  const subject = 'Email Service Test - NAST Portal';
  const text = `This is a test email from the NAST Portal email service.

If you received this message, your SMTP settings are working.`;
  const html = `
    <p>This is a test email from the NAST Portal email service.</p>
    <p>If you received this message, your SMTP settings are working.</p>
  `;

  return await sendEmail(to, subject, text, html);
};

export const sendApprovalEmail = async (userEmail, userName) => {
  const subject = 'Application Status Update - NAST Portal';
  const text = `Dear Sir/Madam,

We are pleased to inform you that your submitted document has been reviewed and found to be accurate and complete.

The document has now been successfully forwarded to the evaluation committee for further assessment.
You will be notified once the evaluation process is completed or if any additional information is required.

Thank you for your submission and cooperation.

Best regards,
System Administration Team`;
  
  const html = `
  <p>Dear Sir/Madam,</p>
  
  <p>
  We are pleased to inform you that your submitted document has been reviewed and found to be accurate and complete.
  </p>
  
  <p>
  The document has now been successfully forwarded to the evaluation committee for further assessment.<br>
  You will be notified once the evaluation process is completed or if any additional information is required.
  </p>
  
  <p>
  Thank you for your submission and cooperation.
  </p>
  
  <p>
  Best regards,<br>
  Promotion and Publicity Division<br>
  NAST
  </p>
  `;
  
  return await sendEmail(userEmail, subject, text, html);
};

// Simple HTML sanitization - remove script tags and dangerous attributes
const sanitizeHtml = (html) => {
  if (!html) return '';
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove event handlers (onclick, onerror, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  // Remove javascript: protocol
  html = html.replace(/javascript:/gi, '');
  return html;
};

export const sendRejectionEmail = async (userEmail, userName, customMessage) => {
  const subject = 'Application Status Update - NAST Portal';
  
  // Sanitize custom message to prevent HTML injection
  const sanitizedMessage = customMessage ? sanitizeHtml(customMessage) : null;
  
  const text = sanitizedMessage || `Dear ${userName || 'Sir/Madam'},

We regret to inform you that your application has been reviewed and unfortunately, it does not meet the required criteria at this time.

If you have any questions or would like further clarification, please do not hesitate to contact us.

Thank you for your interest.

Best regards,

System Administration Team`;

  // Use sanitized message as HTML if provided, otherwise use plain text
  const html = sanitizedMessage ? `<p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>` : null;

  return await sendEmail(userEmail, subject, text, html);
};

export const sendPasswordResetEmail = async (email, resetLink, userName) => {
  const subject = 'Password Reset Request - NAST Portal';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h2>
      </div>
      
      <p>Dear ${userName || 'User'},</p>
      
      <p>We received a request to reset your password for your NAST Portal account. If you made this request, please click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
      
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #856404;">Important Security Information:</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
          <li>This link will expire in 45 minutes</li>
          <li>This link can only be used once</li>
          <li>If you did not request a password reset, please ignore this email</li>
          <li>Your password will remain unchanged if you do not click the link</li>
        </ul>
      </div>
      
      <p>If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
      
      <p>Best regards,<br>
      <strong>NAST Portal System Administration Team</strong></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666; text-align: center;">
        This is an automated message. Please do not reply to this email.
      </p>
    </body>
    </html>
  `;
  
  const text = `Password Reset Request - NAST Portal

Dear ${userName || 'User'},

We received a request to reset your password for your NAST Portal account. If you made this request, please use the following link to reset your password:

${resetLink}

Important Security Information:
- This link will expire in 45 minutes
- This link can only be used once
- If you did not request a password reset, please ignore this email
- Your password will remain unchanged if you do not use the link

If you did not request a password reset, please ignore this email or contact our support team if you have concerns.

Best regards,
NAST Portal System Administration Team

---
This is an automated message. Please do not reply to this email.`;

  return await sendEmail(email, subject, text, html);
};

