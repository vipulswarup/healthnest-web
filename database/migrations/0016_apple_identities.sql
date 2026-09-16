CREATE TABLE IF NOT EXISTS apple_identities (
  apple_sub TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS apple_identities_user_idx ON apple_identities (user_id);
