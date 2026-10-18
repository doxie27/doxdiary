-- Doxie Diary · 0002 · E-Mail-Bestätigung, Kontosperre, Admin-Protokoll

ALTER TABLE users
  ADD COLUMN locked_at DATETIME NULL AFTER email_verified_at,
  ADD COLUMN last_login_at DATETIME NULL AFTER locked_at,
  ADD COLUMN verification_reminded_at DATETIME NULL AFTER last_login_at,
  ADD COLUMN templates_seeded_at DATETIME NULL AFTER verification_reminded_at;

CREATE TABLE email_verifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  email       VARCHAR(254) NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verifications_token (token_hash),
  KEY ix_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Protokoll von Admin-Aktionen: wer, was, an welchem Konto – keine Inhalte
CREATE TABLE admin_audit (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_user_id  BIGINT UNSIGNED NULL,
  action         VARCHAR(40) NOT NULL,
  target_user_id BIGINT UNSIGNED NULL,
  created_at     DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_admin_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bestehende Konten (vor Einführung der Bestätigung) gelten als bestätigt
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
