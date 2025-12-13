import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const updateMedicationSchema = z.object({
  name: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  instructions: z.string().optional(),
  prescribedBy: z.string().optional(),
  source: z.string().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      throw new AppError('Invalid medication ID', 400);
    }

    const db = await getDatabase();
    const medicationsCollection = db.collection('medications');
    const patientsCollection = db.collection('patients');

    const medication = await medicationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!medication) {
      throw new AppError('Medication not found', 404);
    }

    // Verify patient belongs to user
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(medication.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this medication', 403);
    }

    return NextResponse.json({
      ...medication,
      id: medication._id.toString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      throw new AppError('Invalid medication ID', 400);
    }

    const body = await request.json();
    const validationResult = updateMedicationSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const db = await getDatabase();
    const medicationsCollection = db.collection('medications');
    const patientsCollection = db.collection('patients');

    // Verify medication exists and patient belongs to user
    const existingMedication = await medicationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingMedication) {
      throw new AppError('Medication not found', 404);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(existingMedication.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this medication', 403);
    }

    const updateData: any = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    // Parse dates if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    const result = await medicationsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new AppError('Medication not found', 404);
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      throw new AppError('Invalid medication ID', 400);
    }

    const db = await getDatabase();
    const medicationsCollection = db.collection('medications');
    const patientsCollection = db.collection('patients');

    // Verify medication exists and patient belongs to user
    const existingMedication = await medicationsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingMedication) {
      throw new AppError('Medication not found', 404);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(existingMedication.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this medication', 403);
    }

    await medicationsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

