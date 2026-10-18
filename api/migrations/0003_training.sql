-- Doxie Diary · 0003 · Physiotherapie: Übungen, Pläne, Trainingseinheiten

CREATE TABLE exercises (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(80) NOT NULL,
  description   TEXT NOT NULL,
  category      ENUM('kraft','balance','mobilitaet','wahrnehmung','ausdauer','entspannung') NOT NULL,
  reps          SMALLINT UNSIGNED NULL,
  sets          SMALLINT UNSIGNED NULL,
  duration_sec  SMALLINT UNSIGNED NULL,
  rest_sec      SMALLINT UNSIGNED NULL,
  equipment     TEXT NOT NULL,              -- JSON-Liste von Bezeichnungen
  notes         TEXT NOT NULL,
  media_id      BIGINT UNSIGNED NULL,
  source        ENUM('owner','therapist') NOT NULL DEFAULT 'owner',
  template_key  VARCHAR(40) NULL,           -- Herkunft aus den Startvorlagen
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_exercises_owner (owner_user_id),
  CONSTRAINT fk_exercises_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_exercises_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_plans (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dog_id             BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  name               VARCHAR(80) NOT NULL,
  description        VARCHAR(400) NOT NULL DEFAULT '',
  weekdays           TINYINT UNSIGNED NOT NULL DEFAULT 0,   -- Bitmaske: Mo = 1 … So = 64
  time_of_day        CHAR(5) NULL,
  archived_at        DATETIME NULL,
  source             ENUM('owner','therapist') NOT NULL DEFAULT 'owner',
  created_at         DATETIME NOT NULL,
  updated_at         DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_training_plans_dog (dog_id),
  CONSTRAINT fk_training_plans_dog FOREIGN KEY (dog_id) REFERENCES dogs (id) ON DELETE CASCADE,
  CONSTRAINT fk_training_plans_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plan_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id      BIGINT UNSIGNED NOT NULL,
  exercise_id  BIGINT UNSIGNED NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,
  reps         SMALLINT UNSIGNED NULL,
  sets         SMALLINT UNSIGNED NULL,
  duration_sec SMALLINT UNSIGNED NULL,
  rest_sec     SMALLINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY ix_plan_items_plan (plan_id, position),
  CONSTRAINT fk_plan_items_plan FOREIGN KEY (plan_id) REFERENCES training_plans (id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_items_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verlauf mit Namens-Snapshots: bleibt lesbar, auch wenn Pläne/Übungen später geändert oder gelöscht werden
CREATE TABLE training_sessions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dog_id      BIGINT UNSIGNED NOT NULL,
  plan_id     BIGINT UNSIGNED NULL,
  user_id     BIGINT UNSIGNED NULL,
  client_id   VARCHAR(64) NOT NULL,          -- verhindert Doppelungen beim erneuten Senden
  plan_name   VARCHAR(80) NOT NULL,
  started_at  DATETIME NOT NULL,
  finished_at DATETIME NOT NULL,
  active_sec  INT UNSIGNED NOT NULL,
  note        VARCHAR(500) NOT NULL DEFAULT '',
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_sessions_client (dog_id, client_id),
  KEY ix_training_sessions_dog_started (dog_id, started_at),
  CONSTRAINT fk_training_sessions_dog FOREIGN KEY (dog_id) REFERENCES dogs (id) ON DELETE CASCADE,
  CONSTRAINT fk_training_sessions_plan FOREIGN KEY (plan_id) REFERENCES training_plans (id) ON DELETE SET NULL,
  CONSTRAINT fk_training_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_results (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id    BIGINT UNSIGNED NOT NULL,
  plan_item_id  BIGINT UNSIGNED NULL,
  exercise_id   BIGINT UNSIGNED NULL,
  exercise_name VARCHAR(80) NOT NULL,
  position      SMALLINT UNSIGNED NOT NULL,
  status        ENUM('done','skipped') NOT NULL,
  feedback      ENUM('good','hard','issue') NULL,
  note          VARCHAR(300) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY ix_session_results_session (session_id, position),
  CONSTRAINT fk_session_results_session FOREIGN KEY (session_id) REFERENCES training_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_results_item FOREIGN KEY (plan_item_id) REFERENCES plan_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_session_results_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
