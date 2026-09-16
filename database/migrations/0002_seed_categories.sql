INSERT INTO health_record_categories (code, display_name, description) VALUES
  ('LAB_REPORT', 'Lab Report', 'Pathology, microbiology, and other laboratory results'),
  ('PRESCRIPTION', 'Prescription', 'Medication prescription or order'),
  ('CONSULTATION_NOTE', 'Consultation Note', 'Doctor consultation or clinical note'),
  ('IMAGING_REPORT', 'Imaging Report', 'Radiology, ultrasound, CT, MRI, or imaging report'),
  ('DISCHARGE_SUMMARY', 'Discharge Summary', 'Hospital discharge summary'),
  ('VACCINATION_RECORD', 'Vaccination Record', 'Immunization record'),
  ('VITAL_SIGNS', 'Vital Signs', 'Blood pressure, glucose, weight, or other observations'),
  ('ID_DOCUMENT', 'ID Document', 'Identity documents such as Aadhaar, PAN, passport, driving licence, voter ID, SSN, green card, or UK NI / BRP'),
  ('OTHER', 'Other', 'Other health record')
ON CONFLICT (code) DO NOTHING;
