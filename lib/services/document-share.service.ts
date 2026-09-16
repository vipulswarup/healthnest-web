import { randomBytes } from 'crypto';
import { sql } from '@/lib/db/neon';
import { canAccessDocument } from '@/lib/households/access';

const DEFAULT_SHARE_DAYS = 7;

export function generateShareToken(): string {
  return randomBytes(32).toString('hex');
}

export type DocumentShareRow = {
  id: string;
  documentId: string;
  token: string;
  label: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  fileName?: string;
  fileType?: string;
};

function toShare(row: Record<string, unknown>): DocumentShareRow {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    token: String(row.token),
    label: row.label ? String(row.label) : null,
    expiresAt: String(row.expires_at),
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    createdAt: String(row.created_at),
    fileName: row.file_name ? String(row.file_name) : undefined,
    fileType: row.file_type ? String(row.file_type) : undefined,
  };
}

function isActiveShare(row: DocumentShareRow): boolean {
  if (row.revokedAt) return false;
  return new Date(row.expiresAt).getTime() > Date.now();
}

export async function getActiveDocumentShare(documentId: string): Promise<DocumentShareRow | null> {
  const [row] = await sql`
    SELECT id, document_id, token, label, expires_at, revoked_at, created_at
    FROM document_shares
    WHERE document_id = ${documentId}::uuid
      AND revoked_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return row ? toShare(row) : null;
}

export async function createDocumentShare({
  documentId,
  userId,
  label,
  expiresInDays = DEFAULT_SHARE_DAYS,
}: {
  documentId: string;
  userId: string;
  label?: string | null;
  expiresInDays?: number;
}): Promise<DocumentShareRow> {
  if (!(await canAccessDocument(userId, documentId))) {
    throw new Error('FORBIDDEN');
  }

  await sql`
    UPDATE document_shares
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE document_id = ${documentId}::uuid
      AND revoked_at IS NULL
  `;

  const token = generateShareToken();
  const days = Math.min(Math.max(expiresInDays, 1), 30);
  const [created] = await sql`
    INSERT INTO document_shares (document_id, token, created_by, label, expires_at)
    VALUES (
      ${documentId}::uuid,
      ${token},
      ${userId},
      ${label || null},
      NOW() + (${days}::int * INTERVAL '1 day')
    )
    RETURNING id, document_id, token, label, expires_at, revoked_at, created_at
  `;
  return toShare(created);
}

export async function revokeDocumentShare(documentId: string, userId: string): Promise<boolean> {
  if (!(await canAccessDocument(userId, documentId))) {
    throw new Error('FORBIDDEN');
  }
  const rows = await sql`
    UPDATE document_shares
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE document_id = ${documentId}::uuid
      AND revoked_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getPublicDocumentShare(token: string): Promise<(DocumentShareRow & { r2Key: string }) | null> {
  const [row] = await sql`
    SELECT
      ds.id, ds.document_id, ds.token, ds.label, ds.expires_at, ds.revoked_at, ds.created_at,
      d.file_name, d.file_type, d.r2_key
    FROM document_shares ds
    INNER JOIN documents d ON d.id = ds.document_id
    WHERE ds.token = ${token}
      AND ds.revoked_at IS NULL
      AND ds.expires_at > NOW()
    LIMIT 1
  `;
  if (!row || !row.r2_key) return null;
  const share = toShare(row);
  if (!isActiveShare(share)) return null;
  return { ...share, r2Key: String(row.r2_key) };
}
