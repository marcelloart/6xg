CREATE TABLE IF NOT EXISTS market_listings (
 id TEXT PRIMARY KEY NOT NULL,
 seller_id TEXT NOT NULL,
 category TEXT NOT NULL,
 item TEXT NOT NULL,
 currency TEXT NOT NULL CHECK(currency IN ('coins','idr','usd','crypto')),
 unit_price INTEGER NOT NULL CHECK(unit_price BETWEEN 1 AND 1000000),
 original_qty INTEGER NOT NULL CHECK(original_qty BETWEEN 1 AND 10000),
 remaining_qty INTEGER NOT NULL CHECK(remaining_qty BETWEEN 0 AND original_qty),
 status TEXT NOT NULL CHECK(status IN ('active','sold','cancelled')),
 version INTEGER NOT NULL CHECK(version > 0),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS market_browse ON market_listings(currency,status,created_at DESC,id);
CREATE INDEX IF NOT EXISTS market_owner ON market_listings(seller_id,created_at DESC);
CREATE TABLE IF NOT EXISTS market_actions (
 user_id TEXT NOT NULL,
 action_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 result TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,action_id)
);
CREATE TABLE IF NOT EXISTS market_trades (
 id TEXT PRIMARY KEY NOT NULL,
 listing_id TEXT NOT NULL,
 buyer_id TEXT NOT NULL,
 seller_id TEXT NOT NULL,
 category TEXT NOT NULL,
 item TEXT NOT NULL,
 qty INTEGER NOT NULL CHECK(qty > 0),
 unit_price INTEGER NOT NULL CHECK(unit_price > 0),
 currency TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS market_buyer_history ON market_trades(buyer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS market_seller_history ON market_trades(seller_id,created_at DESC);
-- A failed snapshot guard aborts the entire D1 batch, including both farm writes.
CREATE TABLE IF NOT EXISTS market_guards (
 id TEXT PRIMARY KEY NOT NULL,
 valid INTEGER NOT NULL CONSTRAINT market_snapshot_valid CHECK(valid=1)
);
