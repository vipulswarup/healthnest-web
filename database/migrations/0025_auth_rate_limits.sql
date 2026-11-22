-- One row per keyed email/IP hash; no account required and no raw identifiers retained.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  identity_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx ON auth_rate_limits (window_start);
