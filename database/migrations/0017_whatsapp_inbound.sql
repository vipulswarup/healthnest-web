-- Staging table for inbound WhatsApp messages (idempotency + patient picker).
CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id TEXT NOT NULL UNIQUE,
  from_phone TEXT NOT NULL,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  text_body TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_patient'
    CHECK (status IN ('awaiting_patient', 'processing', 'filed', 'failed')),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  health_record_id UUID REFERENCES health_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_from_status_idx
  ON whatsapp_inbound_messages (from_phone, status, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_household_idx
  ON whatsapp_inbound_messages (household_id, created_at DESC);
