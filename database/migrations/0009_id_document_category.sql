INSERT INTO health_record_categories (code, display_name, description) VALUES
  (
    'ID_DOCUMENT',
    'ID Document',
    'Identity documents such as Aadhaar, PAN, passport, driving licence, voter ID, SSN, green card, or UK NI / BRP'
  )
ON CONFLICT (code) DO NOTHING;
