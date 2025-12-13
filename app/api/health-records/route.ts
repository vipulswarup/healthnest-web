import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const createHealthRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  recordType: z.string().min(1, 'Record type is required'),
  data: z.record(z.string(), z.any()),
  tags: z.array(z.string()).optional(),
  source: z.string().min(1, 'Source is required'),
  documentPath: z.string().optional(),
  hospitalSystemName: z.string().optional(),
  hospitalIdentifierType: z.string().optional(),
  hospitalIdentifierValue: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      throw new AppError('patientId query parameter is required', 400);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');
    const healthRecordsCollection = db.collection('health_records');

    // Verify patient belongs to user
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(patientId),
      userId: session.user.id,
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const records = await healthRecordsCollection
      .find({ patientId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      records.map((record) => ({
        ...record,
        id: record._id.toString(),
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
    const validationResult = createHealthRecordSchema.safeParse(body);

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
    const healthRecordsCollection = db.collection('health_records');

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

    const newRecord = {
      patientId: data.patientId,
      recordType: data.recordType,
      data: data.data,
      tags: data.tags || [],
      source: data.source,
      documentPath: data.documentPath || '',
      hospitalSystemName: data.hospitalSystemName || '',
      hospitalIdentifierType: data.hospitalIdentifierType || '',
      hospitalIdentifierValue: data.hospitalIdentifierValue || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await healthRecordsCollection.insertOne(newRecord);

    return NextResponse.json(
      {
        ...newRecord,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

