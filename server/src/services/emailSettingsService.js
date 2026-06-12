import crypto from 'crypto';
import {
  getEmailSettingsRecord,
  upsertEmailSettingsRecord,
} from '../model/emailSettingsModel.js';

const DEFAULT_SETTINGS = {
  enabled: false,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  from_email: '',
  from_name: '',
  has_password: false,
  updated_at: null,
  updated_by: null,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const getEncryptionKey = () => {
  const secret = process.env.EMAIL_SETTINGS_SECRET;
  if (!secret) {
    throw new Error('EMAIL_SETTINGS_SECRET is required to securely store email passwords.');
  }

  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptEmailPassword = (password) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptEmailPassword = (encryptedPassword) => {
  if (!encryptedPassword) return '';

  const [version, ivHex, authTagHex, encryptedHex] = encryptedPassword.split(':');
  if (version !== 'v1' || !ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Saved email password is in an unsupported format.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

const safeSettingsFromRecord = (record) => {
  if (!record) return { ...DEFAULT_SETTINGS };

  return {
    enabled: Boolean(record.enabled),
    smtp_host: record.smtp_host || DEFAULT_SETTINGS.smtp_host,
    smtp_port: Number(record.smtp_port || DEFAULT_SETTINGS.smtp_port),
    smtp_secure: Boolean(record.smtp_secure),
    smtp_user: record.smtp_user || '',
    from_email: record.from_email || '',
    from_name: record.from_name || '',
    has_password: Boolean(record.smtp_pass_encrypted),
    updated_at: record.updated_at || null,
    updated_by: record.updated_by || null,
  };
};

export const getSafeEmailSettings = async () => {
  const record = await getEmailSettingsRecord();
  return safeSettingsFromRecord(record);
};

export const updateEmailSettings = async (payload, adminId) => {
  const existing = await getEmailSettingsRecord();
  const enabled = toBoolean(payload.enabled);
  const smtp_host = normalizeString(payload.smtp_host) || DEFAULT_SETTINGS.smtp_host;
  const smtp_port = Number(payload.smtp_port || DEFAULT_SETTINGS.smtp_port);
  const smtp_secure = toBoolean(payload.smtp_secure);
  const smtp_user = normalizeString(payload.smtp_user);
  const from_email = normalizeString(payload.from_email) || smtp_user;
  const from_name = normalizeString(payload.from_name);
  const passwordInput =
    typeof payload.smtp_pass === 'string'
      ? payload.smtp_pass
      : typeof payload.password === 'string'
        ? payload.password
        : '';

  if (!Number.isInteger(smtp_port) || smtp_port < 1 || smtp_port > 65535) {
    throw new Error('SMTP port must be a valid port number.');
  }

  if (from_email && !EMAIL_RE.test(from_email)) {
    throw new Error('From email must be a valid email address.');
  }

  let smtp_pass_encrypted = existing?.smtp_pass_encrypted || null;
  if (passwordInput.trim() !== '') {
    smtp_pass_encrypted = encryptEmailPassword(passwordInput);
  }

  if (enabled) {
    if (!smtp_host || !smtp_user || !from_email) {
      throw new Error('SMTP host, username, and from email are required when email service is enabled.');
    }

    if (!smtp_pass_encrypted) {
      throw new Error('SMTP password is required when email service is enabled.');
    }
  }

  const updated = await upsertEmailSettingsRecord({
    enabled,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    smtp_pass_encrypted,
    from_email,
    from_name,
    updated_by: adminId,
  });

  return safeSettingsFromRecord(updated);
};

export const getActiveEmailSettings = async () => {
  const record = await getEmailSettingsRecord();
  if (!record || !record.enabled) {
    throw new Error('Email service is not configured or is disabled.');
  }

  if (!record.smtp_user || !record.smtp_pass_encrypted) {
    throw new Error('Email service is missing SMTP credentials.');
  }

  return {
    enabled: Boolean(record.enabled),
    smtp_host: record.smtp_host || DEFAULT_SETTINGS.smtp_host,
    smtp_port: Number(record.smtp_port || DEFAULT_SETTINGS.smtp_port),
    smtp_secure: Boolean(record.smtp_secure),
    smtp_user: record.smtp_user,
    smtp_pass: decryptEmailPassword(record.smtp_pass_encrypted),
    from_email: record.from_email || record.smtp_user,
    from_name: record.from_name || '',
  };
};
