-- Fixed-window, per-user limits for storage and AI-intensive endpoints.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_start_idx
  ON api_rate_limits (window_start);
