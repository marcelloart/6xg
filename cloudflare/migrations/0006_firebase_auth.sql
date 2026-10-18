-- Additive only: original player keys, saves and market ownership stay intact.
CREATE TABLE IF NOT EXISTS auth_links (
  project_id TEXT NOT NULL,
  firebase_subject TEXT NOT NULL,
  account_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, firebase_subject),
  UNIQUE (account_id)
);

-- A write already in flight under the former Firebase key must not create a
-- second farm after linking. SQLite serializes these guards with the link insert.
CREATE TRIGGER IF NOT EXISTS auth_link_farm_insert BEFORE INSERT ON farm_saves
WHEN NEW.user_id LIKE 'firebase:%' AND EXISTS(SELECT 1 FROM auth_links WHERE firebase_subject=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account_linked'); END;
CREATE TRIGGER IF NOT EXISTS auth_link_farm_update BEFORE UPDATE ON farm_saves
WHEN NEW.user_id LIKE 'firebase:%' AND EXISTS(SELECT 1 FROM auth_links WHERE firebase_subject=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account_linked'); END;
CREATE TRIGGER IF NOT EXISTS auth_link_save_insert BEFORE INSERT ON saves
WHEN NEW.user_id LIKE 'firebase:%' AND EXISTS(SELECT 1 FROM auth_links WHERE firebase_subject=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'account_linked'); END;
