-- Many-to-many patients ↔ households. No personal (unlinked) patients.

CREATE TABLE IF NOT EXISTS household_patients (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, patient_id)
);

CREATE INDEX IF NOT EXISTS household_patients_patient_id_idx ON household_patients(patient_id);

-- Backfill from single household_id when present.
INSERT INTO household_patients (household_id, patient_id)
SELECT p.household_id, p.id
FROM patients p
WHERE p.household_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Personal patients: create an owner household and link them.
DO $$
DECLARE
  r RECORD;
  new_household_id UUID;
  hh_name TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT p.owner_id, pr.first_name, pr.last_name
    FROM patients p
    LEFT JOIN profiles pr ON pr.user_id = p.owner_id
    WHERE p.household_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM household_patients hp WHERE hp.patient_id = p.id
      )
  LOOP
    hh_name := COALESCE(NULLIF(TRIM(r.first_name), ''), 'My') || '''s Household';

    INSERT INTO households (name, created_by)
    VALUES (hh_name, r.owner_id)
    RETURNING id INTO new_household_id;

    INSERT INTO household_members (household_id, user_id)
    VALUES (new_household_id, r.owner_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO household_patients (household_id, patient_id)
    SELECT new_household_id, p.id
    FROM patients p
    WHERE p.owner_id = r.owner_id
      AND p.household_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM household_patients hp WHERE hp.patient_id = p.id
      );
  END LOOP;
END $$;

DROP INDEX IF EXISTS patients_household_id_idx;
ALTER TABLE patients DROP COLUMN IF EXISTS household_id;
