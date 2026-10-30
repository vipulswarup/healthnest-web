-- Store the user's current Groq AI processing choice and an immutable record
-- of the notice shown when they made the choice.
CREATE TABLE IF NOT EXISTS groq_ai_consents (
  user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);
