import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const metric = searchParams.get('metric');

    if (!patientId || !metric) {
      throw new AppError('patientId and metric query parameters are required', 400);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');
    const healthRecordsCollection = db.collection('health_records');

    // Verify patient belongs to user
    if (!ObjectId.isValid(patientId)) {
      throw new AppError('Invalid patient ID', 400);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Get all health records for this patient
    const records = await healthRecordsCollection
      .find({ patientId })
      .sort({ createdAt: 1 })
      .toArray();

    // Extract metric values from records
    const trends = records
      .map((record) => {
        const value = record.data?.[metric];
        if (value !== undefined && value !== null) {
          return {
            date: record.createdAt,
            value: typeof value === 'number' ? value : parseFloat(value),
            recordId: record._id.toString(),
            source: record.source,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    return NextResponse.json({
      patientId,
      metric,
      trends,
    });
  } catch (error) {
    return handleError(error);
  }
}

