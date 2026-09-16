CREATE TABLE IF NOT EXISTS blood_pressure_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period TEXT NOT NULL CHECK (period IN ('morning', 'afternoon', 'evening', 'other')),
  systolic INTEGER NOT NULL CHECK (systolic BETWEEN 50 AND 250),
  diastolic INTEGER NOT NULL CHECK (diastolic BETWEEN 30 AND 180),
  pulse INTEGER CHECK (pulse IS NULL OR pulse BETWEEN 20 AND 220),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blood_pressure_readings_patient_recorded_idx
  ON blood_pressure_readings (patient_id, recorded_at DESC);
