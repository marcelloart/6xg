CREATE TABLE native_auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge TEXT NOT NULL,
  account_photo TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX native_auth_expiry ON native_auth_codes(expires_at);
CREATE TABLE native_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX native_session_expiry ON native_sessions(expires_at);
