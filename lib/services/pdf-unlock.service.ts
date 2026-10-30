import { sql } from '@/lib/db/neon';
import { dobPasswordCandidates } from '@/lib/pdf/passwords';
import { closePdfJsDocument, copyPdfBytes, isPdfJsPasswordError, tryUnlockPdf } from '@/lib/pdf/ops';
import { addPatientFilePassword, listPatientFilePasswords } from '@/lib/services/file-password.service';
import { getDocumentProxy } from 'unpdf';

export type PdfUnlockResult = {
  bytes: Uint8Array;
  locked: boolean;
  passwordSaved: boolean;
  password?: string;
  changed: boolean;
};

function uniquePasswords(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function patientDob(patientId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT date_of_birth FROM patients WHERE id = ${patientId}::uuid LIMIT 1
  `;
  if (!row?.date_of_birth) return null;
  if (typeof row.date_of_birth === 'string') return row.date_of_birth.slice(0, 10);
  if (row.date_of_birth instanceof Date) return row.date_of_birth.toISOString().slice(0, 10);
  return String(row.date_of_birth).slice(0, 10);
}

async function pdfJsOpens(bytes: Uint8Array, password?: string): Promise<boolean> {
  const data = copyPdfBytes(bytes);
  try {
    const pdf = await getDocumentProxy(data, password ? { password } : {});
    await closePdfJsDocument(pdf);
    return true;
  } catch (error) {
    if (isPdfJsPasswordError(error)) return false;
    return !password;
  }
}

export async function isPdfLocked(bytes: Uint8Array): Promise<boolean> {
  return !(await pdfJsOpens(bytes));
}

async function decryptWithPdfLib(bytes: Uint8Array, passwords: string[]): Promise<Uint8Array | null> {
  try {
    return await tryUnlockPdf(bytes, passwords);
  } catch {
    return null;
  }
}

/**
 * Try saved person passwords, DOB variants, then any extra passwords from this request.
 * A newly working extra password is stored on the person.
 */
export async function unlockPdfForPatient(options: {
  bytes: Uint8Array;
  patientId?: string;
  extraPasswords?: string[];
  saveExtraPasswords?: boolean;
  actorUserId?: string;
}): Promise<PdfUnlockResult> {
  const bytes = copyPdfBytes(options.bytes);
  const { patientId } = options;
  if (!(await isPdfLocked(bytes))) {
    return { bytes, locked: false, passwordSaved: false, changed: false };
  }

  const saved = patientId ? await listPatientFilePasswords(patientId).catch(() => []) : [];
  const dob = patientId ? dobPasswordCandidates(await patientDob(patientId)) : [];
  const extras = (options.extraPasswords || []).map((value) => value.trim()).filter(Boolean);
  const candidates = uniquePasswords([...saved.map((row) => row.password), ...dob, ...extras]);

  let workingPassword: string | undefined;
  for (const password of candidates) {
    if (await pdfJsOpens(bytes, password)) {
      workingPassword = password;
      break;
    }
  }
  if (!workingPassword) {
    return { bytes, locked: true, passwordSaved: false, changed: false };
  }

  let passwordSaved = false;
  if (patientId && options.saveExtraPasswords && options.actorUserId) {
    const savedSet = new Set(saved.map((row) => row.password));
    if (!savedSet.has(workingPassword) && extras.includes(workingPassword)) {
      await addPatientFilePassword({
        patientId,
        userId: options.actorUserId,
        password: workingPassword,
      });
      passwordSaved = true;
    }
  }

  const decrypted = await decryptWithPdfLib(bytes, [workingPassword, ...candidates]);
  if (decrypted) {
    return {
      bytes: decrypted,
      locked: false,
      passwordSaved,
      password: workingPassword,
      changed: true,
    };
  }

  return {
    bytes,
    locked: false,
    passwordSaved,
    password: workingPassword,
    changed: false,
  };
}
