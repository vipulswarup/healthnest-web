ALTER TABLE device_tokens
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'expo';

ALTER TABLE device_tokens
  ADD CONSTRAINT device_tokens_provider_check
    CHECK (provider IN ('expo', 'fcm'));
