-- Doxie Diary · 0005 · Highlights im Tagebuch (für Rückblick & Erinnerungsbuch)

ALTER TABLE diary_entries ADD COLUMN highlight TINYINT(1) NOT NULL DEFAULT 0 AFTER text;
