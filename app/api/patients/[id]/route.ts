import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  suffix: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  gender: z.string().optional(),
  abhaNumber: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relation: z.string().min(1, 'Emergency contact relation is required'),
  })).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  hospitalIdentifiers: z.array(z.object({
    systemName: z.string(),
    identifierType: z.string(),
    value: z.string(),
  })).optional(),
  mobileNumbers: z.array(z.object({
    countryCode: z.string(),
    number: z.string(),
  })).optional(),
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
      throw new AppError('Invalid patient ID', 400);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return NextResponse.json({
      ...patient,
      id: patient._id.toString(),
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
      throw new AppError('Invalid patient ID', 400);
    }

    const body = await request.json();
    const validationResult = updatePatientSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.issues[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    // Verify patient belongs to user
    const existingPatient = await patientsCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!existingPatient) {
      throw new AppError('Patient not found', 404);
    }

    const updateData: any = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    // Parse dateOfBirth if provided
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const result = await patientsCollection.findOneAndUpdate(
      { _id: new ObjectId(id), userId: session.user.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new AppError('Patient not found', 404);
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
      throw new AppError('Invalid patient ID', 400);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    const result = await patientsCollection.findOneAndDelete({
      _id: new ObjectId(id),
      userId: session.user.id,
    });

    if (!result) {
      throw new AppError('Patient not found', 404);
    }

    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

