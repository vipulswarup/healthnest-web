import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { sha256Hex } from '@/lib/security/checksum';
import { AppError } from '@/lib/middleware/error-handler';

function keyBytes(): Buffer {
  const raw = process.env.FILE_PASSWORD_SECRET || process.env.NEON_AUTH_COOKIE_SECRET;
  if (!raw?.trim()) {
    throw new AppError('File password encryption is not configured', 500);
  }
  return Buffer.from(sha256Hex(raw.trim()), 'hex');
}

/** AES-256-GCM. Stored as base64(iv + tag + ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length < 29) throw new AppError('Stored secret is invalid', 500);
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
