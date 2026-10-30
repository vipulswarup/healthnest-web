import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db/neon';
import { getR2Object } from '@/lib/r2';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { getCareShareByToken } from '@/lib/services/care-share.service';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string; documentId: string }> },
) {
  try {
    const { token, documentId } = await params;
    if (!z.string().uuid().safeParse(documentId).success) throw new AppError('Invalid document', 400);
    const share = await getCareShareByToken(token);
    if (!share) throw new AppError('Share not found or revoked', 404);

    const [doc] = await sql`
      SELECT d.r2_key, d.file_name, d.file_type, d.patient_id
      FROM documents d
      INNER JOIN care_share_patients csp
        ON csp.patient_id = d.patient_id
      INNER JOIN care_shares cs
        ON cs.id = csp.care_share_id
      WHERE d.id = ${documentId}::uuid
        AND cs.token = ${token}
        AND cs.revoked_at IS NULL
      LIMIT 1
    `;
    if (!doc?.r2_key) throw new AppError('Document not found', 404);

    const body = await getR2Object(String(doc.r2_key));
    if (!body) throw new AppError('Document not found', 404);
    const bytes = Buffer.from(await body.transformToByteArray());
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': String(doc.file_type || 'application/pdf'),
        'Content-Disposition': `inline; filename="${String(doc.file_name || 'document')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
