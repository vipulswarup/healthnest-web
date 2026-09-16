import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { medicationCountrySchema } from '@/lib/medications/schemas';
import { searchVerifiedCatalogueProducts } from '@/lib/services/medication-catalog-search.service';

/**
 * Returns only reviewed, active catalogue products. Pending and flagged products
 * are intentionally never candidates for a patient confirmation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const country = medicationCountrySchema.safeParse(request.nextUrl.searchParams.get('country'));
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    if (!country.success) throw new AppError('Choose India, USA, or UK before searching', 400);
    if (query.length < 2 || query.length > 100) {
      throw new AppError('Enter between 2 and 100 characters to search the catalogue', 400);
    }

    return NextResponse.json(await searchVerifiedCatalogueProducts(country.data, query));
  } catch (error) {
    return handleError(error);
  }
}
