import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getAllDoctors, findDoctorByName, createDoctor } from '@/lib/services/doctor.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError('Unauthorized', 401);
    }

    const doctors = await getAllDoctors();
    return NextResponse.json(doctors);
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

    const { name } = await request.json();
    if (!name || !name.trim()) {
      throw new AppError('Doctor name is required', 400);
    }

    // Check if doctor already exists
    const existing = await findDoctorByName(name);
    if (existing) {
      return NextResponse.json(existing);
    }

    // Create new doctor
    const newDoctor = await createDoctor(name);
    return NextResponse.json(newDoctor, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

