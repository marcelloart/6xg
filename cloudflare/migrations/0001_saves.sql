CREATE TABLE IF NOT EXISTS saves (
  user_id TEXT PRIMARY KEY NOT NULL,
  save TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  saved_at TEXT NOT NULL
);
