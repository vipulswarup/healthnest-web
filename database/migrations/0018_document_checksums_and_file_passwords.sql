-- Lookup hashes for per-patient duplicate detection. checksum_sha256 already
-- exists on documents; it was never populated on upload.
CREATE INDEX IF NOT EXISTS documents_checksum_sha256_idx
  ON documents (checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_patient_checksum_idx
  ON documents (patient_id, checksum_sha256)
  WHERE patient_id IS NOT NULL AND checksum_sha256 IS NOT NULL;

-- Encrypted PDF unlock passwords, stored per person (not per user).
CREATE TABLE IF NOT EXISTS patient_file_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  secret_ciphertext TEXT NOT NULL,
  secret_digest TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, secret_digest)
);

CREATE INDEX IF NOT EXISTS patient_file_passwords_patient_idx
  ON patient_file_passwords (patient_id, created_at DESC);
