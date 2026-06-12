import { connectToDatabase } from '../config/db.js';

let ensureTablePromise;

export const ensureEmailSettingsTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      const pool = await connectToDatabase();
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS email_settings (
          id TINYINT NOT NULL DEFAULT 1 PRIMARY KEY,
          enabled TINYINT(1) NOT NULL DEFAULT 0,
          smtp_host VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
          smtp_port INT NOT NULL DEFAULT 587,
          smtp_secure TINYINT(1) NOT NULL DEFAULT 0,
          smtp_user VARCHAR(255) DEFAULT NULL,
          smtp_pass_encrypted TEXT DEFAULT NULL,
          from_email VARCHAR(255) DEFAULT NULL,
          from_name VARCHAR(255) DEFAULT NULL,
          updated_by INT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT chk_email_settings_single_row CHECK (id = 1),
          CONSTRAINT fk_email_settings_admin
            FOREIGN KEY (updated_by) REFERENCES admin(aid)
            ON DELETE SET NULL
        )
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  return ensureTablePromise;
};

export const getEmailSettingsRecord = async () => {
  await ensureEmailSettingsTable();
  const pool = await connectToDatabase();
  const [rows] = await pool.execute('SELECT * FROM email_settings WHERE id = 1');
  return rows[0] || null;
};

export const upsertEmailSettingsRecord = async ({
  enabled,
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_user,
  smtp_pass_encrypted,
  from_email,
  from_name,
  updated_by,
}) => {
  await ensureEmailSettingsTable();
  const pool = await connectToDatabase();

  await pool.execute(
    `
      INSERT INTO email_settings (
        id,
        enabled,
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_user,
        smtp_pass_encrypted,
        from_email,
        from_name,
        updated_by
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_secure = VALUES(smtp_secure),
        smtp_user = VALUES(smtp_user),
        smtp_pass_encrypted = VALUES(smtp_pass_encrypted),
        from_email = VALUES(from_email),
        from_name = VALUES(from_name),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      enabled ? 1 : 0,
      smtp_host,
      smtp_port,
      smtp_secure ? 1 : 0,
      smtp_user || null,
      smtp_pass_encrypted || null,
      from_email || null,
      from_name || null,
      updated_by || null,
    ]
  );

  return getEmailSettingsRecord();
};
