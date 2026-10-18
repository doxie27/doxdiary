-- Doxie Diary · 0004 · Tagebuch mit Fotos

CREATE TABLE diary_entries (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dog_id      BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,
  client_id   VARCHAR(64) NULL,              -- für den einmaligen Import lokaler Einträge
  occurred_at DATETIME NOT NULL,
  category    ENUM('alltag','gesundheit','verhalten','training','erlebnis') NOT NULL,
  title       VARCHAR(80) NOT NULL,
  text        TEXT NOT NULL,
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_diary_entries_client (dog_id, client_id),
  KEY ix_diary_entries_dog_time (dog_id, occurred_at),
  CONSTRAINT fk_diary_entries_dog FOREIGN KEY (dog_id) REFERENCES dogs (id) ON DELETE CASCADE,
  CONSTRAINT fk_diary_entries_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diary_photos (
  entry_id  BIGINT UNSIGNED NOT NULL,
  media_id  BIGINT UNSIGNED NOT NULL,
  position  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (entry_id, media_id),
  CONSTRAINT fk_diary_photos_entry FOREIGN KEY (entry_id) REFERENCES diary_entries (id) ON DELETE CASCADE,
  CONSTRAINT fk_diary_photos_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
