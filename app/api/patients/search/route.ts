import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const hospitalSystem = searchParams.get('hospitalSystem');
    const identifierType = searchParams.get('identifierType');
    const identifierValue = searchParams.get('identifierValue');
    const mobileNumber = searchParams.get('mobileNumber');

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    let query: any = { userId: session.user.id };

    if (hospitalSystem && identifierType && identifierValue) {
      query['hospitalIdentifiers'] = {
        $elemMatch: {
          systemName: hospitalSystem,
          identifierType,
          value: identifierValue,
        },
      };
    } else if (mobileNumber) {
      query['mobileNumbers.number'] = mobileNumber;
    } else {
      throw new AppError(
        'Please provide either hospitalSystem+identifierType+identifierValue or mobileNumber',
        400
      );
    }

    const patients = await patientsCollection.find(query).toArray();

    return NextResponse.json(
      patients.map((patient) => ({
        ...patient,
        id: patient._id.toString(),
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}

