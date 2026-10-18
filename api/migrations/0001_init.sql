-- Doxie Diary · 0001 · Grundschema: Konten, Hunde, Freigaben, Medien
-- Kompatibel mit MySQL 8.0 und MariaDB 10.6+. Alle Zeitstempel in UTC.

CREATE TABLE users (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email            VARCHAR(254) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  first_name       VARCHAR(60)  NOT NULL,
  last_name        VARCHAR(60)  NOT NULL DEFAULT '',
  role             ENUM('owner','therapist') NOT NULL DEFAULT 'owner',
  session_version  INT UNSIGNED NOT NULL DEFAULT 1,
  email_verified_at DATETIME NULL,
  privacy_accepted_at DATETIME NOT NULL,
  created_at       DATETIME NOT NULL,
  updated_at       DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY ix_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate-Limiting: nur HMAC-Hashes, keine Klartext-E-Mails oder IP-Adressen
CREATE TABLE auth_attempts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action      VARCHAR(20) NOT NULL,
  subject_hash CHAR(64) NOT NULL,
  attempted_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_auth_attempts_lookup (action, subject_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  storage_key   CHAR(40) NOT NULL,
  mime          VARCHAR(40) NOT NULL,
  bytes         INT UNSIGNED NOT NULL,
  width         INT UNSIGNED NULL,
  height        INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_storage_key (storage_key),
  KEY ix_media_owner (owner_user_id),
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dogs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(40) NOT NULL,
  breed          VARCHAR(60) NOT NULL DEFAULT '',
  sex            ENUM('female','male') NOT NULL,
  birth_date     DATE NOT NULL,
  weight_kg      DECIMAL(5,2) NOT NULL,
  neutered       TINYINT(1) NULL,
  health_notes   TEXT NOT NULL,
  bio            VARCHAR(280) NOT NULL DEFAULT '',
  accent         ENUM('sage','honey','clay','sky') NOT NULL DEFAULT 'sage',
  photo_media_id BIGINT UNSIGNED NULL,
  created_at     DATETIME NOT NULL,
  updated_at     DATETIME NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_dogs_photo FOREIGN KEY (photo_media_id) REFERENCES media (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wer darf auf welchen Hund zugreifen. role/scopes bereiten Familie & Therapeut:innen vor.
CREATE TABLE dog_members (
  dog_id      BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  role        ENUM('owner','family','therapist') NOT NULL,
  scopes      SET('profile','training','diary') NOT NULL DEFAULT 'profile,training,diary',
  invited_by  BIGINT UNSIGNED NULL,
  accepted_at DATETIME NULL,
  revoked_at  DATETIME NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (dog_id, user_id),
  KEY ix_dog_members_user (user_id),
  CONSTRAINT fk_dog_members_dog FOREIGN KEY (dog_id) REFERENCES dogs (id) ON DELETE CASCADE,
  CONSTRAINT fk_dog_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_dog_members_inviter FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
