-- SanoVault application schema. Neon Auth owns the neon_auth schema; this
-- migration deliberately stores only a stable reference to an auth user.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT,
  title TEXT,
  suffix TEXT,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  mobile_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  abha_number TEXT,
  blood_group TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  hospital_identifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  file_type TEXT NOT NULL,
  checksum_sha256 TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'eisenvault',
  eisenvault_document_id TEXT UNIQUE,
  eisenvault_folder_id TEXT,
  eisenvault_version TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ocr_status TEXT CHECK (ocr_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  ocr_text TEXT,
  ai_status TEXT CHECK (ai_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  classification TEXT,
  extracted_data JSONB,
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(5, 4),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_tags TEXT[] NOT NULL DEFAULT '{}',
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  doctor_name TEXT,
  document_date DATE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ocr_text TEXT,
  hospital_system_name TEXT,
  hospital_identifier_type TEXT,
  hospital_identifier_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  instructions TEXT,
  prescribed_by TEXT,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_time TIMESTAMPTZ,
  is_taken BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_time TIME NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency TEXT NOT NULL,
  days_of_week SMALLINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_record_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS healthcare_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preferred_name TEXT NOT NULL UNIQUE,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preferred_name TEXT NOT NULL UNIQUE,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patients_owner_id_idx ON patients(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS patients_owner_abha_number_idx ON patients(owner_id, abha_number) WHERE abha_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS health_records_patient_created_at_idx ON health_records(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS health_records_tags_idx ON health_records USING GIN(tags);
CREATE INDEX IF NOT EXISTS health_records_data_idx ON health_records USING GIN(data);
CREATE INDEX IF NOT EXISTS medications_patient_active_idx ON medications(patient_id, is_active);
CREATE INDEX IF NOT EXISTS medication_doses_medication_scheduled_idx ON medication_doses(medication_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS documents_owner_uploaded_idx ON documents(owner_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS documents_patient_id_idx ON documents(patient_id);
CREATE INDEX IF NOT EXISTS audit_events_patient_created_idx ON audit_events(patient_id, created_at DESC);
