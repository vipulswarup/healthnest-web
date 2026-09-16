-- Document bytes live in the private Cloudflare R2 bucket. Neon retains only
-- metadata, ownership, and the opaque R2 key used to mint signed download URLs.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS r2_key TEXT;

ALTER TABLE documents
  ALTER COLUMN storage_provider SET DEFAULT 'r2';

CREATE UNIQUE INDEX IF NOT EXISTS documents_r2_key_unique_idx
  ON documents (r2_key)
  WHERE r2_key IS NOT NULL;
