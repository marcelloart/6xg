ALTER TABLE farm_saves ADD COLUMN last_action_id TEXT;
CREATE TABLE IF NOT EXISTS farm_actions (
 user_id TEXT NOT NULL,
 action_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 result TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id, action_id)
);
CREATE INDEX IF NOT EXISTS farm_actions_age ON farm_actions(user_id, created_at);
