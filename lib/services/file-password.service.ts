import { sql } from '@/lib/db/neon';
import { sha256Hex } from '@/lib/security/checksum';
import { decryptSecret, encryptSecret } from '@/lib/security/secret-box';

export type FilePassword = {
  id: string;
  password: string;
  createdAt: Date;
};

type PasswordRow = {
  id: string;
  secret_ciphertext: string;
  created_at: Date;
};

function toPassword(row: PasswordRow): FilePassword {
  return {
    id: String(row.id),
    password: decryptSecret(String(row.secret_ciphertext)),
    createdAt: row.created_at,
  };
}

export async function listPatientFilePasswords(patientId: string): Promise<FilePassword[]> {
  const rows = await sql`
    SELECT id, secret_ciphertext, created_at
    FROM patient_file_passwords
    WHERE patient_id = ${patientId}::uuid
    ORDER BY created_at ASC
  `;
  return (rows as PasswordRow[]).map(toPassword);
}

export async function addPatientFilePassword(options: {
  patientId: string;
  userId: string;
  password: string;
}): Promise<FilePassword> {
  const password = options.password.trim();
  const digest = sha256Hex(password);
  const ciphertext = encryptSecret(password);
  const [row] = await sql`
    INSERT INTO patient_file_passwords (patient_id, secret_ciphertext, secret_digest, created_by)
    VALUES (${options.patientId}::uuid, ${ciphertext}, ${digest}, ${options.userId})
    ON CONFLICT (patient_id, secret_digest)
    DO UPDATE SET secret_digest = EXCLUDED.secret_digest
    RETURNING id, secret_ciphertext, created_at
  `;
  return toPassword(row as PasswordRow);
}

export async function deletePatientFilePassword(options: {
  patientId: string;
  passwordId: string;
}): Promise<boolean> {
  const [row] = await sql`
    DELETE FROM patient_file_passwords
    WHERE id = ${options.passwordId}::uuid AND patient_id = ${options.patientId}::uuid
    RETURNING id
  `;
  return Boolean(row);
}
