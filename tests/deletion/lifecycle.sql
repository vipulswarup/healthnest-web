-- Run only against a disposable migrated database. Every fixture rolls back.
BEGIN;
DO $$
DECLARE a TEXT := 'deletion-test-a'; b TEXT := 'deletion-test-b'; outsider TEXT := 'deletion-test-outsider';
  f1 UUID; f2 UUID; f3 UUID; p1 UUID; p2 UUID; p3 UUID; d1 UUID; d2 UUID; blocked BOOLEAN;
BEGIN
  INSERT INTO profiles(user_id, first_name, email) VALUES (a,'A','deletion-a@example.invalid'),(b,'B','deletion-b@example.invalid'),(outsider,'Other','deletion-other@example.invalid');
  INSERT INTO households(name,created_by) VALUES ('First',a) RETURNING id INTO f1;
  INSERT INTO households(name,created_by) VALUES ('Second',b) RETURNING id INTO f2;
  INSERT INTO households(name,created_by) VALUES ('Solo',a) RETURNING id INTO f3;
  INSERT INTO household_members(household_id,user_id) VALUES (f1,a),(f1,b),(f2,b),(f3,a);
  INSERT INTO patients(owner_id,first_name,date_of_birth,gender) VALUES (a,'Shared','2000-01-01','other') RETURNING id INTO p1;
  INSERT INTO patients(owner_id,first_name,date_of_birth,gender) VALUES (a,'Only First','2000-01-01','other') RETURNING id INTO p2;
  INSERT INTO patients(owner_id,first_name,date_of_birth,gender) VALUES (a,'Solo Patient','2000-01-01','other') RETURNING id INTO p3;
  INSERT INTO household_patients VALUES (f1,p1,NOW()),(f2,p1,NOW()),(f1,p2,NOW()),(f3,p3,NOW());
  INSERT INTO documents(owner_id,patient_id,file_name,file_size,file_type,r2_key) VALUES (a,p1,'shared.pdf',1,'application/pdf','test/shared') RETURNING id INTO d1;
  -- Legacy record-only association must also be erased.
  INSERT INTO documents(owner_id,file_name,file_size,file_type,r2_key) VALUES (a,'private.pdf',1,'application/pdf','test/private') RETURNING id INTO d2;
  INSERT INTO health_records(patient_id,record_type,source,document_id) VALUES (p1,'LAB_REPORT','test',d1),(p2,'LAB_REPORT','test',d2);
  INSERT INTO document_shares(document_id,token,created_by,expires_at) VALUES(d2,'test-delete-share',a,NOW()+INTERVAL '1 day');
  INSERT INTO whatsapp_inbound_messages(wa_message_id,from_phone,household_id,document_id,patient_id,text_body) VALUES ('test-delete-message','100000000',f1,d2,p2,'private contents');
  INSERT INTO audit_events(actor_id,patient_id,event_type,entity_type,entity_id) VALUES (a,p2,'created','patient',p2::text);

  blocked := FALSE;
  BEGIN PERFORM remove_family_patient(outsider,f1,p1); EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'FAMILY_NOT_FOUND' THEN RAISE; END IF; blocked := TRUE;
  END;
  ASSERT blocked, 'Nonmember must not remove patients';
  blocked := FALSE;
  BEGIN PERFORM erase_family(b,f1); EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'FAMILY_OWNER_REQUIRED' THEN RAISE; END IF; blocked := TRUE;
  END;
  ASSERT blocked, 'Member who is not creator must not delete family';

  PERFORM remove_family_patient(a,f1,p1);
  ASSERT EXISTS(SELECT 1 FROM patients WHERE id=p1), 'Shared patient must remain';
  ASSERT EXISTS(SELECT 1 FROM documents WHERE id=d1), 'Shared file must remain';
  ASSERT NOT EXISTS(SELECT 1 FROM household_patients WHERE household_id=f1 AND patient_id=p1), 'Family link must be removed';
  ASSERT NOT EXISTS(SELECT 1 FROM deletion_jobs WHERE target='test/shared'), 'Shared object must not be queued';

  PERFORM erase_family(a,f1);
  ASSERT NOT EXISTS(SELECT 1 FROM households WHERE id=f1), 'Family must be removed';
  ASSERT NOT EXISTS(SELECT 1 FROM patients WHERE id=p2), 'Exclusive patient must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM documents WHERE id=d2), 'Legacy document must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM document_shares WHERE document_id=d2), 'Shares must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM whatsapp_inbound_messages WHERE document_id=d2), 'Inbound text must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM audit_events WHERE patient_id=p2), 'Patient audit rows must be erased';
  ASSERT EXISTS(SELECT 1 FROM deletion_jobs WHERE kind='r2' AND target='test/private'), 'Physical object deletion must be durable';
  ASSERT EXISTS(SELECT 1 FROM profiles WHERE user_id=b), 'Family deletion must preserve logins';

  -- Account creator a has a shared family with b and a separate sole-member family.
  INSERT INTO household_members(household_id,user_id) VALUES(f2,a);
  UPDATE households SET created_by=a WHERE id=f2;
  INSERT INTO visit_notes(patient_id,recorded_by,observed) VALUES(p1,a,'retain shared note');
  INSERT INTO vaccinations(patient_id,recorded_by,vaccine_name,administered_date) VALUES(p1,a,'test',CURRENT_DATE);
  INSERT INTO growth_measurements(patient_id,recorded_by,weight_kg) VALUES(p1,a,70);
  INSERT INTO blood_pressure_readings(patient_id,recorded_by,period,systolic,diastolic) VALUES(p1,a,'morning',120,80);
  INSERT INTO patient_file_passwords(patient_id,created_by,secret_ciphertext,secret_digest) VALUES(p1,a,'test-cipher','test-digest');
  INSERT INTO mobile_sessions(user_id,token_hash,expires_at) VALUES(a,'test-session',NOW()+INTERVAL '1 day');
  INSERT INTO device_tokens(user_id,platform,token) VALUES(a,'ios','test-device');
  INSERT INTO apple_identities(apple_sub,user_id,refresh_token_ciphertext) VALUES('test-apple',a,'encrypted-test-token');
  INSERT INTO household_invites(household_id,email,token,invited_by,expires_at) VALUES(f2,'deletion-a@example.invalid','test-invite',b,NOW()+INTERVAL '1 day');
  INSERT INTO documents(owner_id,file_name,file_size,file_type,r2_key) VALUES(a,'unfiled.pdf',1,'application/pdf','test/unfiled');

  PERFORM erase_login_account(a);
  ASSERT NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=a), 'Login profile must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM mobile_sessions WHERE user_id=a), 'Mobile sessions must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM device_tokens WHERE user_id=a), 'Devices must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM apple_identities WHERE user_id=a), 'Apple identity must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM household_invites WHERE email='deletion-a@example.invalid'), 'Incoming invites must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM households WHERE id=f3), 'Solo family must be erased';
  ASSERT NOT EXISTS(SELECT 1 FROM patients WHERE id=p3), 'Solo patient must be erased';
  ASSERT EXISTS(SELECT 1 FROM households WHERE id=f2 AND created_by=b), 'Family ownership must transfer';
  ASSERT EXISTS(SELECT 1 FROM patients WHERE id=p1 AND owner_id=b), 'Shared patient ownership must transfer';
  ASSERT EXISTS(SELECT 1 FROM documents WHERE id=d1 AND owner_id=b), 'Shared document must transfer';
  ASSERT EXISTS(SELECT 1 FROM visit_notes WHERE patient_id=p1 AND recorded_by IS NULL), 'Notes must survive account deletion';
  ASSERT EXISTS(SELECT 1 FROM vaccinations WHERE patient_id=p1 AND recorded_by IS NULL), 'Vaccinations must survive';
  ASSERT EXISTS(SELECT 1 FROM growth_measurements WHERE patient_id=p1 AND recorded_by IS NULL), 'Growth must survive';
  ASSERT EXISTS(SELECT 1 FROM blood_pressure_readings WHERE patient_id=p1 AND recorded_by IS NULL), 'Vitals must survive';
  ASSERT EXISTS(SELECT 1 FROM patient_file_passwords WHERE patient_id=p1 AND created_by IS NULL), 'File passwords must survive';
  ASSERT EXISTS(SELECT 1 FROM deletion_jobs WHERE kind='neon' AND target=a), 'Login-provider cleanup must be queued';
  ASSERT EXISTS(SELECT 1 FROM deletion_jobs WHERE kind='apple' AND target='encrypted-test-token'), 'Apple revocation must be queued';
  ASSERT EXISTS(SELECT 1 FROM deletion_jobs WHERE kind='r2' AND target='test/unfiled'), 'Unfiled uploads must be erased';
  blocked := FALSE;
  BEGIN INSERT INTO profiles(user_id,first_name) VALUES(a,'Resurrected'); EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ACCOUNT_DELETED' THEN RAISE; END IF; blocked := TRUE;
  END;
  ASSERT blocked, 'A stale session must not recreate the account';
  PERFORM erase_login_account(a); -- Safe retry, no unrelated deletion.
  ASSERT EXISTS(SELECT 1 FROM profiles WHERE user_id=b), 'Retries must preserve other users';

  PERFORM remove_family_patient(b,f2,p1);
  ASSERT NOT EXISTS(SELECT 1 FROM patients WHERE id=p1), 'Last family removal must erase patient';
  ASSERT EXISTS(SELECT 1 FROM deletion_jobs WHERE kind='r2' AND target='test/shared'), 'Last family removal must erase object';
  RAISE NOTICE 'PASS: authorization, shared/exclusive patients, family deletion, account ownership transfer, dependent data, durable cleanup, stale-session rejection, idempotency';
END $$;
ROLLBACK;
