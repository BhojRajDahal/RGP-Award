import { getSafeEmailSettings, updateEmailSettings } from '../services/emailSettingsService.js';
import { sendTestEmail } from '../services/emailService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getEmailSettingsController = async (_req, res) => {
  try {
    const settings = await getSafeEmailSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({
      msg: error.message || 'Failed to fetch email settings',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export const updateEmailSettingsController = async (req, res) => {
  try {
    const settings = await updateEmailSettings(req.body || {}, req.admin?.aid);
    res.status(200).json({
      msg: 'Email settings saved successfully',
      settings,
    });
  } catch (error) {
    res.status(400).json({
      msg: error.message || 'Failed to save email settings',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export const testEmailSettingsController = async (req, res) => {
  const to = typeof req.body?.to === 'string' && req.body.to.trim()
    ? req.body.to.trim()
    : req.admin?.email;

  if (!to || !EMAIL_RE.test(to)) {
    return res.status(400).json({ msg: 'A valid test recipient email is required.' });
  }

  try {
    const result = await sendTestEmail(to);
    res.status(200).json({
      msg: 'Test email sent successfully',
      result,
    });
  } catch (error) {
    res.status(400).json({
      msg: error.message || 'Failed to send test email',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
