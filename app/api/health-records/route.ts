import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { ObjectId } from 'mongodb';
import { getDocumentById } from '@/lib/services/document.service';
import { findDoctorByName, createDoctor } from '@/lib/services/doctor.service';

const createHealthRecordSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  recordType: z.string().min(1, 'Record type is required'),
  data: z.record(z.string(), z.any()),
  tags: z.array(z.string()).optional(),
  source: z.string().min(1, 'Source is required'),
  doctorName: z.string().optional(),
  documentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  documentPath: z.string().optional(),
  ocrText: z.string().optional(),
  documentId: z.string().optional(),
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
    const keyword = searchParams.get('keyword') || '';
    const source = searchParams.get('source') || '';
    const recordType = searchParams.get('recordType') || '';
    const tag = searchParams.get('tag') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const db = await getDatabase();
    const patientsCollection = db.collection('patients');
    const healthRecordsCollection = db.collection('health_records');

    // Build query
    const query: any = {};

    // If patientId is provided, verify it belongs to user and filter by it
    if (patientId) {
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
      query.patientId = patientId;
    } else {
      // If no patientId, get all patient IDs for this user
      const userPatients = await patientsCollection
        .find({ userId: session.user.id })
        .project({ _id: 1 })
        .toArray();
      
      if (userPatients.length === 0) {
        return NextResponse.json([]);
      }
      
      query.patientId = { $in: userPatients.map(p => p._id.toString()) };
    }

    // Filter by source
    if (source) {
      query.source = { $regex: source, $options: 'i' };
    }

    // Filter by recordType
    if (recordType) {
      query.recordType = recordType;
    }

    // Filter by tag
    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        query.createdAt.$lte = end;
      }
    }

    // Full-text keyword search using MongoDB text index
    if (keyword) {
      // Use MongoDB $text search if text index exists, otherwise fallback to regex
      try {
        query.$text = { $search: keyword };
        // Text search returns results sorted by relevance score
        const records = await healthRecordsCollection
          .find(query)
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .toArray();
        
        return NextResponse.json(
          records.map((record) => ({
            ...record,
            id: record._id.toString(),
          }))
        );
      } catch (textSearchError) {
        // Fallback to regex search if text index doesn't exist or fails
        console.warn('Text index search failed, using regex fallback:', textSearchError);
        const keywordRegex = { $regex: keyword, $options: 'i' };
        query.$or = [
          { source: keywordRegex },
          { doctorName: keywordRegex },
          { tags: { $in: [new RegExp(keyword, 'i')] } },
          { recordType: keywordRegex },
          { ocrText: keywordRegex },
        ];
      }
    }

    const records = await healthRecordsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // If keyword search with regex fallback, also filter records by searching in data object
    let filteredRecords = records;
    if (keyword && !query.$text) {
      const keywordLower = keyword.toLowerCase();
      filteredRecords = records.filter(record => {
        // Search in source
        if (record.source?.toLowerCase().includes(keywordLower)) return true;
        
        // Search in tags
        if (record.tags?.some((t: string) => t.toLowerCase().includes(keywordLower))) return true;
        
        // Search in recordType
        if (record.recordType?.toLowerCase().includes(keywordLower)) return true;
        
        // Search in OCR text
        if (record.ocrText?.toLowerCase().includes(keywordLower)) return true;
        
        // Search in data object (stringified)
        if (record.data) {
          const dataString = JSON.stringify(record.data).toLowerCase();
          if (dataString.includes(keywordLower)) return true;
        }
        
        return false;
      });
    }

    return NextResponse.json(
      filteredRecords.map((record) => ({
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
        validationResult.error.issues[0].message,
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

    // Fetch OCR text from document if documentId is provided
    let ocrText = data.ocrText || '';
    if (data.documentId && !ocrText) {
      try {
        const document = await getDocumentById(data.documentId);
        if (document && document.userId === session.user.id && document.ocrText) {
          ocrText = document.ocrText;
        }
      } catch (err) {
        console.warn('Failed to fetch OCR text from document:', err);
      }
    }

    // Normalize and save doctor name
    let finalDoctorName = data.doctorName || '';
    if (finalDoctorName.trim()) {
      try {
        const matchedDoctor = await findDoctorByName(finalDoctorName);
        if (matchedDoctor) {
          finalDoctorName = matchedDoctor.preferredName;
        } else {
          // Create new doctor entry
          const newDoctor = await createDoctor(finalDoctorName);
          finalDoctorName = newDoctor.preferredName;
        }
      } catch (err) {
        console.warn('Failed to normalize doctor name:', err);
        // Continue with original name if normalization fails
      }
    }

    // Parse document date if provided
    let documentDate: Date | undefined;
    if (data.documentDate) {
      try {
        documentDate = new Date(data.documentDate);
        // Validate date
        if (isNaN(documentDate.getTime())) {
          documentDate = undefined;
        }
      } catch (err) {
        console.warn('Invalid document date provided:', err);
      }
    }

    const newRecord = {
      patientId: data.patientId,
      recordType: data.recordType,
      data: data.data,
      tags: data.tags || [],
      source: data.source,
      doctorName: finalDoctorName,
      documentDate: documentDate,
      documentPath: data.documentPath || '',
      ocrText: ocrText,
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

