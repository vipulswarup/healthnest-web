import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const updateHealthRecordSchema = z.object({
  recordType: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  documentPath: z.string().optional(),
  hospitalSystemName: z.string().optional(),
  hospitalIdentifierType: z.string().optional(),
  hospitalIdentifierValue: z.string().optional(),
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
      throw new AppError('Invalid health record ID', 400);
    }

    const db = await getDatabase();
    const healthRecordsCollection = db.collection('health_records');
    const patientsCollection = db.collection('patients');

    const record = await healthRecordsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!record) {
      throw new AppError('Health record not found', 404);
    }

    // Verify patient belongs to user
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(record.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this record', 403);
    }

    return NextResponse.json({
      ...record,
      id: record._id.toString(),
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
      throw new AppError('Invalid health record ID', 400);
    }

    const body = await request.json();
    const validationResult = updateHealthRecordSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const db = await getDatabase();
    const healthRecordsCollection = db.collection('health_records');
    const patientsCollection = db.collection('patients');

    // Verify record exists and patient belongs to user
    const existingRecord = await healthRecordsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingRecord) {
      throw new AppError('Health record not found', 404);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(existingRecord.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this record', 403);
    }

    const updateData = {
      ...validationResult.data,
      updatedAt: new Date(),
    };

    const result = await healthRecordsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new AppError('Health record not found', 404);
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
      throw new AppError('Invalid health record ID', 400);
    }

    const db = await getDatabase();
    const healthRecordsCollection = db.collection('health_records');
    const patientsCollection = db.collection('patients');

    // Verify record exists and patient belongs to user
    const existingRecord = await healthRecordsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingRecord) {
      throw new AppError('Health record not found', 404);
    }

    const patient = await patientsCollection.findOne({
      _id: new ObjectId(existingRecord.patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Unauthorized access to this record', 403);
    }

    await healthRecordsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

