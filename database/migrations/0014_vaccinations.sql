CREATE TABLE IF NOT EXISTS vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  dose_label TEXT,
  administered_date DATE NOT NULL,
  provider TEXT,
  lot_number TEXT,
  site TEXT,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vaccinations_patient_date_idx
  ON vaccinations (patient_id, administered_date DESC);

CREATE INDEX IF NOT EXISTS vaccinations_patient_next_due_idx
  ON vaccinations (patient_id, next_due_date)
  WHERE next_due_date IS NOT NULL;
