import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';

const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  suffix: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.string().min(1, 'Gender is required'),
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    const patients = await patientsCollection
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .toArray();

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = createPatientSchema.safeParse(body);

    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const data = validationResult.data;
    
    // Parse dateOfBirth
    const dateOfBirth = new Date(data.dateOfBirth);

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');

    const newPatient = {
      userId: session.user.id,
      firstName: data.firstName,
      middleName: data.middleName || '',
      lastName: data.lastName || '',
      title: data.title || '',
      suffix: data.suffix || '',
      emails: data.emails || [],
      dateOfBirth,
      gender: data.gender,
      abhaNumber: data.abhaNumber || '',
      bloodGroup: data.bloodGroup || '',
      emergencyContacts: data.emergencyContacts || [],
      preferences: data.preferences || {},
      hospitalIdentifiers: data.hospitalIdentifiers || [],
      mobileNumbers: data.mobileNumbers || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await patientsCollection.insertOne(newPatient);

    return NextResponse.json(
      {
        ...newPatient,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

