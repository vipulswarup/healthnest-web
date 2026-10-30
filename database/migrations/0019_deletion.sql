-- External deletion work survives database commits and transient provider errors.
CREATE TABLE deletion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('r2', 'neon', 'apple')),
  target TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, target)
);

-- Block cached web sessions from recreating deleted profiles while provider
-- deletion is retried. No email, name, or health data is retained here.
CREATE TABLE deleted_accounts (
  user_id_hash TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE apple_identities ADD COLUMN refresh_token_ciphertext TEXT;

CREATE FUNCTION queue_document_erasure() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.r2_key IS NOT NULL THEN
    INSERT INTO deletion_jobs (kind, target) VALUES ('r2', OLD.r2_key) ON CONFLICT DO NOTHING;
  END IF;
  DELETE FROM audit_events WHERE entity_type = 'document' AND entity_id = OLD.id::text;
  DELETE FROM whatsapp_inbound_messages WHERE document_id = OLD.id;
  RETURN OLD;
END $$;
CREATE TRIGGER document_erasure BEFORE DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION queue_document_erasure();

CREATE FUNCTION erase_patient_dependents() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Delete documents BEFORE patient/record cascades erase the association.
  DELETE FROM documents d WHERE (d.patient_id = OLD.id OR d.id IN
    (SELECT document_id FROM health_records WHERE patient_id = OLD.id))
    AND NOT EXISTS (SELECT 1 FROM health_records r WHERE r.document_id = d.id AND r.patient_id <> OLD.id);
  UPDATE documents d SET patient_id = (SELECT r.patient_id FROM health_records r
    WHERE r.document_id = d.id AND r.patient_id <> OLD.id ORDER BY r.created_at LIMIT 1)
    WHERE d.patient_id = OLD.id;
  DELETE FROM whatsapp_inbound_messages WHERE patient_id = OLD.id;
  DELETE FROM audit_events WHERE patient_id = OLD.id
    OR (entity_type = 'patient' AND entity_id = OLD.id::text)
    OR (entity_type = 'health_record' AND entity_id IN (SELECT id::text FROM health_records WHERE patient_id = OLD.id))
    OR (entity_type = 'medication' AND entity_id IN (SELECT id::text FROM medications WHERE patient_id = OLD.id));
  RETURN OLD;
END $$;

CREATE FUNCTION leave_family(actor TEXT, family UUID) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE successor TEXT;
BEGIN
  PERFORM lock_deletion_graph();
  IF NOT EXISTS (SELECT 1 FROM household_members WHERE household_id = family AND user_id = actor) THEN
    RAISE EXCEPTION 'FAMILY_NOT_FOUND';
  END IF;
  SELECT user_id INTO successor FROM household_members WHERE household_id = family AND user_id <> actor
    ORDER BY joined_at, user_id LIMIT 1;
  IF successor IS NULL THEN
    IF EXISTS (SELECT 1 FROM household_patients WHERE household_id = family) THEN
      RAISE EXCEPTION 'USE_DELETE_FAMILY';
    END IF;
    UPDATE households SET created_by = actor WHERE id = family;
    PERFORM erase_family(actor, family);
    RETURN TRUE;
  END IF;
  UPDATE households SET created_by = successor WHERE id = family AND created_by = actor;
  DELETE FROM household_members WHERE household_id = family AND user_id = actor;
  UPDATE profiles SET preferences = preferences - 'activeHouseholdId'
    WHERE user_id = actor AND preferences->>'activeHouseholdId' = family::text;
  RETURN FALSE;
END $$;
CREATE TRIGGER patient_erasure BEFORE DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION erase_patient_dependents();

-- Deletions are short database-only transactions. These locks also serialize
-- concurrent link/member/invite mutations so an orphan check cannot race.
CREATE FUNCTION lock_deletion_graph() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  LOCK TABLE profiles, households, household_members, patients, household_patients,
    documents, health_records, household_invites IN SHARE ROW EXCLUSIVE MODE;
END $$;

CREATE FUNCTION remove_family_patient(actor TEXT, family UUID, person UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM lock_deletion_graph();
  IF NOT EXISTS (SELECT 1 FROM household_members WHERE household_id = family AND user_id = actor) THEN
    RAISE EXCEPTION 'FAMILY_NOT_FOUND';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM household_patients WHERE household_id = family AND patient_id = person) THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND';
  END IF;
  DELETE FROM household_patients WHERE household_id = family AND patient_id = person;
  IF NOT EXISTS (SELECT 1 FROM household_patients WHERE patient_id = person) THEN
    DELETE FROM patients WHERE id = person;
  END IF;
END $$;

CREATE FUNCTION erase_family(actor TEXT, family UUID) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE person UUID;
BEGIN
  PERFORM lock_deletion_graph();
  IF NOT EXISTS (SELECT 1 FROM households h JOIN household_members m ON m.household_id = h.id
    WHERE h.id = family AND h.created_by = actor AND m.user_id = actor) THEN
    RAISE EXCEPTION 'FAMILY_OWNER_REQUIRED';
  END IF;
  FOR person IN SELECT patient_id FROM household_patients WHERE household_id = family LOOP
    PERFORM remove_family_patient(actor, family, person);
  END LOOP;
  -- Unfiled WhatsApp uploads are not attached to a patient yet.
  DELETE FROM documents d WHERE d.id IN (
    SELECT document_id FROM whatsapp_inbound_messages WHERE household_id = family
  ) AND d.patient_id IS NULL AND NOT EXISTS (SELECT 1 FROM health_records r WHERE r.document_id = d.id);
  DELETE FROM households WHERE id = family;
  UPDATE profiles SET preferences = preferences - 'activeHouseholdId'
    WHERE preferences->>'activeHouseholdId' = family::text;
END $$;

CREATE FUNCTION erase_login_account(actor TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE family UUID; successor TEXT; person RECORD; address TEXT;
BEGIN
  PERFORM lock_deletion_graph();
  SELECT email INTO address FROM profiles WHERE user_id = actor;

  FOR family IN SELECT h.id FROM households h WHERE h.created_by = actor
    OR EXISTS (SELECT 1 FROM household_members m WHERE m.household_id = h.id AND m.user_id = actor)
  LOOP
    SELECT user_id INTO successor FROM household_members WHERE household_id = family AND user_id <> actor
      ORDER BY joined_at, user_id LIMIT 1;
    IF successor IS NULL THEN
      -- A departed creator can still own an empty family in older data.
      UPDATE households SET created_by = actor WHERE id = family;
      INSERT INTO household_members(household_id, user_id) VALUES (family, actor) ON CONFLICT DO NOTHING;
      PERFORM erase_family(actor, family);
    ELSE
      UPDATE households SET created_by = successor WHERE id = family AND created_by = actor;
    END IF;
  END LOOP;

  -- Ownership is an internal foreign key, not an independent access grant.
  -- Transfer surviving shared records before deleting the profile cascades.
  FOR person IN SELECT p.id FROM patients p WHERE p.owner_id = actor LOOP
    SELECT m.user_id INTO successor FROM household_patients hp JOIN household_members m USING (household_id)
      WHERE hp.patient_id = person.id AND m.user_id <> actor ORDER BY m.joined_at, m.user_id LIMIT 1;
    IF successor IS NULL THEN
      DELETE FROM patients WHERE id = person.id;
    ELSE
      UPDATE patients SET owner_id = successor WHERE id = person.id;
    END IF;
  END LOOP;
  -- Keep attribution nullable instead of deleting another family's vitals/notes.
  UPDATE blood_pressure_readings SET recorded_by = NULL WHERE recorded_by = actor;
  UPDATE growth_measurements SET recorded_by = NULL WHERE recorded_by = actor;
  UPDATE vaccinations SET recorded_by = NULL WHERE recorded_by = actor;
  UPDATE visit_notes SET recorded_by = NULL WHERE recorded_by = actor;
  UPDATE patient_file_passwords SET created_by = NULL WHERE created_by = actor;
  UPDATE documents d SET owner_id = p.owner_id FROM patients p
    WHERE d.owner_id = actor AND (d.patient_id = p.id OR (d.patient_id IS NULL AND EXISTS (
      SELECT 1 FROM health_records r WHERE r.document_id = d.id AND r.patient_id = p.id)));
  -- Preserve unfiled uploads in surviving shared families too.
  UPDATE documents d SET owner_id = h.created_by FROM whatsapp_inbound_messages w JOIN households h ON h.id = w.household_id
    WHERE d.id = w.document_id AND d.owner_id = actor AND h.created_by <> actor;
  DELETE FROM audit_events WHERE actor_id = actor;
  DELETE FROM household_invites WHERE LOWER(email) = LOWER(address);
  INSERT INTO deletion_jobs(kind, target) SELECT 'apple', refresh_token_ciphertext FROM apple_identities
    WHERE user_id = actor AND refresh_token_ciphertext IS NOT NULL ON CONFLICT DO NOTHING;
  IF actor NOT LIKE 'apple:%' THEN
    INSERT INTO deletion_jobs(kind, target) VALUES ('neon', actor) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO deleted_accounts(user_id_hash) VALUES (encode(digest(actor, 'sha256'), 'hex')) ON CONFLICT DO NOTHING;
  DELETE FROM profiles WHERE user_id = actor;
END $$;

-- Preserve family records when the person who entered them deletes their login.
ALTER TABLE blood_pressure_readings ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE blood_pressure_readings DROP CONSTRAINT blood_pressure_readings_recorded_by_fkey;
ALTER TABLE blood_pressure_readings ADD FOREIGN KEY(recorded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE growth_measurements ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE growth_measurements DROP CONSTRAINT growth_measurements_recorded_by_fkey;
ALTER TABLE growth_measurements ADD FOREIGN KEY(recorded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE vaccinations DROP CONSTRAINT vaccinations_recorded_by_fkey;
ALTER TABLE vaccinations ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE vaccinations ADD FOREIGN KEY(recorded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE visit_notes DROP CONSTRAINT visit_notes_recorded_by_fkey;
ALTER TABLE visit_notes ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE visit_notes ADD FOREIGN KEY(recorded_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
ALTER TABLE patient_file_passwords ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE patient_file_passwords DROP CONSTRAINT patient_file_passwords_created_by_fkey;
ALTER TABLE patient_file_passwords ADD FOREIGN KEY(created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Families may independently hold a profile for the same person. Reassigning
-- the internal owner after account deletion must not collide on their ABHA.
DROP INDEX patients_owner_abha_number_idx;
CREATE INDEX patients_owner_abha_lookup_idx ON patients(owner_id, abha_number) WHERE abha_number IS NOT NULL;

CREATE FUNCTION prevent_deleted_account_restore() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM deleted_accounts WHERE user_id_hash = encode(digest(NEW.user_id, 'sha256'), 'hex')) THEN
    RAISE EXCEPTION 'ACCOUNT_DELETED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deleted_account_guard BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_deleted_account_restore();

CREATE FUNCTION link_patient_to_family(actor TEXT, family UUID, person UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM lock_deletion_graph();
  IF NOT EXISTS (SELECT 1 FROM household_members WHERE household_id = family AND user_id = actor)
    OR NOT (EXISTS (SELECT 1 FROM household_patients hp JOIN household_members hm USING (household_id)
      WHERE hp.patient_id = person AND hm.user_id = actor) OR EXISTS (SELECT 1 FROM patients p WHERE p.id = person AND p.owner_id = actor
        AND NOT EXISTS (SELECT 1 FROM household_patients hp WHERE hp.patient_id = person))) THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND';
  END IF;
  INSERT INTO household_patients(household_id,patient_id) VALUES(family,person) ON CONFLICT DO NOTHING;
END $$;
