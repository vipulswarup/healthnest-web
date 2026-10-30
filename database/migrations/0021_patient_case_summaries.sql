CREATE TABLE IF NOT EXISTS patient_case_summaries (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  source_hash TEXT,
  summary TEXT,
  generated_at TIMESTAMPTZ,
  generation_token UUID,
  generation_expires_at TIMESTAMPTZ
);
