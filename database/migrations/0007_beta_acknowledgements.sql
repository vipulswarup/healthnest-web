-- Preserve an immutable, versioned record of each user's acknowledgement of
-- the beta service notice. The notice text is stored with the acceptance so a
-- future wording change never changes what an earlier user agreed to.
CREATE TABLE IF NOT EXISTS beta_acknowledgements (
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  acknowledgement_version TEXT NOT NULL,
  acknowledgement_text TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  PRIMARY KEY (user_id, acknowledgement_version)
);

CREATE INDEX IF NOT EXISTS beta_acknowledgements_user_accepted_idx
  ON beta_acknowledgements (user_id, accepted_at DESC);
