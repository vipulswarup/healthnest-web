import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { medicationCountrySchema } from '@/lib/medications/schemas';
import { extractMedicationFromPhoto } from '@/lib/services/medication-extract.service';
import { enforceHourlyRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    await enforceHourlyRateLimit(user.id, 'ocr-intake');
    await enforceHourlyRateLimit(user.id, 'ai');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new AppError('A photo file is required', 400);
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      throw new AppError('Photo must be between 1 byte and 15MB', 400);
    }

    const mime = file.type.toLowerCase() || 'image/jpeg';
    if (!mime.startsWith('image/')) {
      throw new AppError('Upload a photo of the medicine pack or strip', 400);
    }

    const countryField = formData.get('country');
    const countryParsed = medicationCountrySchema.safeParse(countryField);
    const defaultCountry = countryParsed.success ? countryParsed.data : 'IN';

    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractMedicationFromPhoto(buffer, mime, defaultCountry);

    return NextResponse.json(extraction);
  } catch (error) {
    return handleError(error);
  }
}
