import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { canAccessPatient } from '@/lib/households/access';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import { recordAuditEvent } from '@/lib/services/audit.service';
import {
  medicationCompositionSchema,
  medicationCountrySchema,
  resolveMedicationComposition,
} from '@/lib/medications/schemas';
import {
  listAccessibleMedications,
  replaceMedicationComposition,
  toMedication,
} from '@/lib/services/medication.service';
import { queueMedicationCatalogueSubmission } from '@/lib/services/medication-catalogue.service';

const medicationSchema = z.object({
  patientId: z.string().uuid('Patient ID is required'),
  name: z.string().min(1, 'Medication brand name is required').max(160),
  purchaseCountry: medicationCountrySchema.optional().nullable(),
  dosage: z.string().min(1, 'Dosage is required').max(300),
  frequency: z.string().min(1, 'Frequency is required').max(160),
  route: z.string().min(1, 'Route is required').max(80),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  instructions: z.string().max(2000).optional(),
  prescribedBy: z.string().max(160).optional(),
  source: z.string().max(160).optional(),
  indication: z.string().max(500).optional(),
  stoppedReason: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().max(80)).max(30).optional(),
  composition: medicationCompositionSchema.optional(),
});

async function currentUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const patientId = request.nextUrl.searchParams.get('patientId');
    const isActiveParam = request.nextUrl.searchParams.get('isActive');

    if (!patientId || !z.string().uuid().safeParse(patientId).success) {
      throw new AppError('A valid patient ID is required', 400);
    }
    if (isActiveParam !== null && isActiveParam !== 'true' && isActiveParam !== 'false') {
      throw new AppError('isActive must be true or false', 400);
    }
    if (!(await canAccessPatient(user.id, patientId))) throw new AppError('Patient not found', 404);

    const medications = await listAccessibleMedications(
      user.id,
      patientId,
      isActiveParam === null ? null : isActiveParam === 'true',
    );
    return NextResponse.json(medications.map(toMedication));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const parsed = medicationSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;
    if (!(await canAccessPatient(user.id, data.patientId))) throw new AppError('Patient not found', 404);
    const composition = await resolveMedicationComposition(data.composition, data.purchaseCountry);

    const [medication] = await sql`
      INSERT INTO medications (
        patient_id, name, original_brand_name, purchase_country, dosage, frequency, route,
        start_date, end_date, instructions, prescribed_by, source, indication, stopped_reason,
        is_active, tags
      ) VALUES (
        ${data.patientId}::uuid, ${data.name}, ${data.name}, ${data.purchaseCountry || null},
        ${data.dosage}, ${data.frequency}, ${data.route}, ${data.startDate}::date,
        ${data.endDate || null}::date, ${data.instructions || null}, ${data.prescribedBy || null},
        ${data.source || null}, ${data.indication || null}, ${data.stoppedReason || null},
        ${data.isActive ?? true}, ${data.tags || []}
      )
      RETURNING id
    `;
    await replaceMedicationComposition({ medicationId: String(medication.id), userId: user.id, composition });
    if (composition.status === 'UNCONFIRMED' && data.purchaseCountry) {
      await queueMedicationCatalogueSubmission({
        country: data.purchaseCountry,
        brandName: data.name,
        formulation: composition.formulation || '',
        ingredients: composition.ingredients,
      });
    }
    const medicines = await listAccessibleMedications(user.id, data.patientId, null);
    const saved = medicines.find((item) => String(item.id) === String(medication.id));

    await recordAuditEvent({
      actorId: user.id,
      patientId: data.patientId,
      eventType: 'created',
      entityType: 'medication',
      entityId: String(medication.id),
      metadata: { compositionStatus: composition.status, ingredientCount: composition.ingredients.length },
    });
    return NextResponse.json(saved ? toMedication(saved) : { id: medication.id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
