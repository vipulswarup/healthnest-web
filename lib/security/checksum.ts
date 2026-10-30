import { createHash } from 'crypto';

export function sha256Hex(value: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}
