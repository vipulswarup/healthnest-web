CREATE TABLE IF NOT EXISTS care_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  label TEXT,
  invited_email TEXT,
  doctor_user_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_shares_token_active
  ON care_shares (token)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_care_shares_creator
  ON care_shares (created_by)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_care_shares_doctor
  ON care_shares (doctor_user_id)
  WHERE revoked_at IS NULL AND doctor_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS care_share_patients (
  care_share_id UUID NOT NULL REFERENCES care_shares(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (care_share_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_care_share_patients_patient
  ON care_share_patients (patient_id);

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write']::TEXT[],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_active
  ON api_tokens (user_id)
  WHERE revoked_at IS NULL;
