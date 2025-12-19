import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { handleError, AppError } from '@/lib/middleware/error-handler';
import { findDoctorByName, createDoctor } from '@/lib/services/doctor.service';

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

    // Try to find matching doctor
    let doctor = await findDoctorByName(name);
    
    // If not found, create a new one
    if (!doctor) {
      doctor = await createDoctor(name);
    }

    return NextResponse.json({ 
      matched: doctor.preferredName,
      doctor 
    });
  } catch (error) {
    return handleError(error);
  }
}

