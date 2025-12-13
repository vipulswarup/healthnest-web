import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const createMedicationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().min(1, 'Route is required'),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  instructions: z.string().optional(),
  prescribedBy: z.string().optional(),
  source: z.string().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const isActive = searchParams.get('isActive');

    if (!patientId) {
      throw new AppError('patientId query parameter is required', 400);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');
    const medicationsCollection = db.collection('medications');

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

    const query: any = { patientId };
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const medications = await medicationsCollection
      .find(query)
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json(
      medications.map((medication) => ({
        ...medication,
        id: medication._id.toString(),
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = createMedicationSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const data = validationResult.data;

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');
    const medicationsCollection = db.collection('medications');

    // Verify patient belongs to user
    if (!ObjectId.isValid(data.patientId)) {
      throw new AppError('Invalid patient ID', 400);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(data.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const newMedication = {
      patientId: data.patientId,
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      route: data.route,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      instructions: data.instructions || '',
      prescribedBy: data.prescribedBy || '',
      source: data.source || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await medicationsCollection.insertOne(newMedication);

    return NextResponse.json(
      {
        ...newMedication,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

