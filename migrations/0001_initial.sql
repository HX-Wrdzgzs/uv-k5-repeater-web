CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'trusted_contributor', 'moderator', 'admin')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'github')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'email',
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  request_ip TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS repeaters (
  id TEXT PRIMARY KEY,
  station_key TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  callsign TEXT NOT NULL,
  station_name TEXT NOT NULL DEFAULT '',
  rx_mhz REAL NOT NULL,
  tx_mhz REAL NOT NULL,
  ctcss_hz REAL,
  mode TEXT NOT NULL DEFAULT 'FM',
  rx_only INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'unknown',
  source_label TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_date INTEGER,
  collected_date INTEGER,
  verified_at INTEGER,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'retired')),
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  repeater_id TEXT REFERENCES repeaters(id),
  kind TEXT NOT NULL CHECK (kind IN ('create', 'update', 'retire')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'retired')),
  risk TEXT NOT NULL DEFAULT 'high' CHECK (risk IN ('low', 'high')),
  validation_json TEXT NOT NULL DEFAULT '[]',
  review_note TEXT,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_ip TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  repeater_id TEXT REFERENCES repeaters(id),
  reporter_user_id TEXT REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS export_snapshots (
  version TEXT PRIMARY KEY,
  source_date INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  json_payload TEXT NOT NULL,
  csv_payload TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repeaters_location ON repeaters(province, city, status);
CREATE INDEX IF NOT EXISTS idx_repeaters_frequency ON repeaters(rx_mhz, tx_mhz);
CREATE INDEX IF NOT EXISTS idx_submissions_queue ON submissions(status, risk, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_login_tokens_lookup ON login_tokens(token_hash, expires_at, used_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at);
