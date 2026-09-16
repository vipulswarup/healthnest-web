CREATE TABLE IF NOT EXISTS growth_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  height_cm NUMERIC(5,2) CHECK (height_cm IS NULL OR (height_cm >= 30 AND height_cm <= 250)),
  weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR (weight_kg >= 0.5 AND weight_kg <= 300)),
  head_circum_cm NUMERIC(4,1) CHECK (head_circum_cm IS NULL OR (head_circum_cm >= 20 AND head_circum_cm <= 70)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT growth_measurements_has_value CHECK (
    height_cm IS NOT NULL OR weight_kg IS NOT NULL OR head_circum_cm IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS growth_measurements_patient_measured_idx
  ON growth_measurements (patient_id, measured_at DESC);
