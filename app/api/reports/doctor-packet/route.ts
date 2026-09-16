import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { toPatient } from '@/lib/db/mappers';
import { getAccessiblePatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { humanizeLabel } from '@/lib/constants/labels';
import { loadBloodSummaryForPatient } from '@/lib/reports/load-blood-summary';
import {
  ageFromDateOfBirth,
  conditionLines,
  labPacketLines,
  labTrendLines,
  medicationDetailLine,
  medicationSummaryLine,
} from '@/lib/reports/doctor-packet';
import { listAccessibleMedications, toMedication } from '@/lib/services/medication.service';
import { listBloodPressureWeek } from '@/lib/services/blood-pressure.service';
import { listGrowthHistory } from '@/lib/services/growth.service';
import { listVisitNotes } from '@/lib/services/visit-notes.service';
import { listVaccinations } from '@/lib/services/vaccinations.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);

    const patientId = request.nextUrl.searchParams.get('patientId');
    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }

    const row = await getAccessiblePatient(user.id, patientId);
    if (!row) throw new AppError('Patient not found', 404);
    const patient = toPatient(row);

    const [medicationRows, summary, bpWeek, growthHistory, vaccinations, visitNotes, documentRows] = await Promise.all([
      listAccessibleMedications(user.id, patientId, true),
      loadBloodSummaryForPatient(patientId),
      listBloodPressureWeek(user.id, patientId),
      listGrowthHistory(user.id, patientId),
      listVaccinations(user.id, patientId),
      listVisitNotes(user.id, patientId),
      sql`
        SELECT id, record_type, source, document_id, document_date, created_at
        FROM health_records
        WHERE patient_id = ${patientId}::uuid
          AND document_id IS NOT NULL
        ORDER BY COALESCE(document_date, created_at::date) DESC, created_at DESC
        LIMIT 5
      `,
    ]);

    const medications = medicationRows.map(toMedication);
    const highlights = labPacketLines({
      findings: summary.keyFindings,
      latestCandidate: summary.latestCandidate,
    });
    const labTrends = labTrendLines(summary.comparisons);

    return NextResponse.json({
      patient: {
        id: String(patient.id),
        firstName: String(patient.firstName || ''),
        lastName: patient.lastName ? String(patient.lastName) : '',
        dateOfBirth: patient.dateOfBirth || null,
        age: ageFromDateOfBirth(patient.dateOfBirth as string | Date | undefined),
        gender: patient.gender ? String(patient.gender) : '',
        bloodGroup: patient.bloodGroup ? String(patient.bloodGroup) : '',
      },
      conditions: conditionLines(medications),
      medicines: medications.map((medication) => ({
        id: medication.id,
        line: medicationSummaryLine(medication),
        detailLine: medicationDetailLine(medication),
        warning: medication.composition.requiresWarning,
      })),
      labHighlights: highlights,
      labTrends,
      bloodPressure: {
        available: Boolean(bpWeek && bpWeek.lines.length > 0),
        lines: bpWeek?.lines || [],
      },
      growth: {
        available: Boolean(growthHistory && growthHistory.lines.length > 0),
        lines: growthHistory?.lines || [],
        latest: growthHistory?.latest || { heightCm: null, weightKg: null, measuredAt: null },
      },
      vaccinations: {
        available: Boolean(vaccinations && vaccinations.packetLines.length > 0),
        upcoming: vaccinations?.upcoming || [],
        lines: vaccinations?.packetLines || [],
      },
      visitNotes: {
        nextAppointment: visitNotes?.nextAppointment || null,
        lines: visitNotes?.packetLines || [],
      },
      documents: documentRows.map((record) => {
        const date = record.document_date || record.created_at;
        const when = date
          ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(String(date)))
          : '';
        return {
          id: String(record.id),
          documentId: record.document_id ? String(record.document_id) : null,
          label: `${humanizeLabel(String(record.record_type || 'Report'))}${when ? ` · ${when}` : ''}`,
          href: `/health-records/${record.id}/document`,
        };
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Unauthorized', 401);
    const body = await request.json().catch(() => ({}));
    const patientId = typeof body.patientId === 'string' ? body.patientId : '';
    if (!z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }
    const patient = await getAccessiblePatient(user.id, patientId);
    if (!patient) throw new AppError('Patient not found', 404);
    const { notifyPatientHousehold } = await import('@/lib/services/device-push.service');
    await notifyPatientHousehold(patientId, {
      title: 'Doctor packet shared',
      body: 'A one-page clinic summary was sent from SanoVault.',
      data: { patientId },
    }, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
