import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { sql } from '@/lib/db/neon';
import { AppError, handleError } from '@/lib/middleware/error-handler';
import {
  medicationCompositionSchema,
  medicationCountrySchema,
  resolveMedicationComposition,
} from '@/lib/medications/schemas';
import { recordAuditEvent } from '@/lib/services/audit.service';
import {
  getAccessibleMedication,
  replaceMedicationComposition,
  toMedication,
} from '@/lib/services/medication.service';
import { queueMedicationCatalogueSubmission } from '@/lib/services/medication-catalogue.service';

const medicationIdSchema = z.string().uuid('Invalid medication ID');
const updateMedicationSchema = z.object({
  name: z.string().min(1).optional(),
  originalBrandName: z.string().min(1).max(160).optional(),
  purchaseCountry: medicationCountrySchema.optional().nullable(),
  dosage: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  instructions: z.string().optional(),
  prescribedBy: z.string().optional(),
  source: z.string().optional(),
  indication: z.string().max(500).optional(),
  stoppedReason: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  composition: medicationCompositionSchema.optional(),
});

async function requestContext(params: Promise<{ id: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new AppError('Unauthorized', 401);
  const parsedId = medicationIdSchema.safeParse((await params).id);
  if (!parsedId.success) throw new AppError(parsedId.error.issues[0].message, 400);
  return { user, id: parsedId.data };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await requestContext(params);
    const medication = await getAccessibleMedication(user.id, id);
    if (!medication) throw new AppError('Medication not found', 404);
    return NextResponse.json(toMedication(medication));
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await requestContext(params);
    const parsed = updateMedicationSchema.safeParse(await request.json());
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
    const data = parsed.data;

    const existing = await getAccessibleMedication(user.id, id);
    if (!existing) throw new AppError('Medication not found', 404);

    const nextPurchaseCountry = data.purchaseCountry !== undefined
      ? data.purchaseCountry
      : (existing.purchase_country ? String(existing.purchase_country) : null);
    const nextBrandName = data.originalBrandName ?? data.name;

    const [medication] = await sql`
      UPDATE medications m SET
        name = COALESCE(${data.name ?? nextBrandName ?? null}, m.name),
        original_brand_name = COALESCE(${nextBrandName ?? null}, m.original_brand_name),
        purchase_country = COALESCE(${data.purchaseCountry ?? null}, m.purchase_country),
        dosage = COALESCE(${data.dosage ?? null}, m.dosage),
        frequency = COALESCE(${data.frequency ?? null}, m.frequency),
        route = COALESCE(${data.route ?? null}, m.route),
        start_date = COALESCE(${data.startDate ?? null}::date, m.start_date),
        end_date = CASE
          WHEN ${data.endDate === null} THEN NULL
          ELSE COALESCE(${data.endDate ?? null}::date, m.end_date)
        END,
        instructions = COALESCE(${data.instructions ?? null}, m.instructions),
        prescribed_by = COALESCE(${data.prescribedBy ?? null}, m.prescribed_by),
        source = COALESCE(${data.source ?? null}, m.source),
        indication = COALESCE(${data.indication ?? null}, m.indication),
        stopped_reason = COALESCE(${data.stoppedReason ?? null}, m.stopped_reason),
        is_active = COALESCE(${data.isActive ?? null}, m.is_active),
        tags = COALESCE(${data.tags ?? null}, m.tags),
        updated_at = NOW()
      FROM patients p
      WHERE m.patient_id = p.id AND m.id = ${id}::uuid
        AND EXISTS (
          SELECT 1
          FROM household_patients hp
          INNER JOIN household_members hm
            ON hm.household_id = hp.household_id AND hm.user_id = ${user.id}
          WHERE hp.patient_id = p.id
        )
      RETURNING m.*
    `;
    if (!medication) throw new AppError('Medication not found', 404);

    if (data.composition) {
      const composition = await resolveMedicationComposition(data.composition, nextPurchaseCountry as 'IN' | 'US' | 'GB' | null);
      await replaceMedicationComposition({ medicationId: id, userId: user.id, composition });
      if (composition.status === 'UNCONFIRMED' && nextPurchaseCountry && nextBrandName) {
        await queueMedicationCatalogueSubmission({
          country: nextPurchaseCountry as 'IN' | 'US' | 'GB',
          brandName: nextBrandName,
          formulation: composition.formulation || '',
          ingredients: composition.ingredients,
        });
      }
    }

    await recordAuditEvent({
      actorId: user.id,
      patientId: medication.patient_id,
      eventType: 'updated',
      entityType: 'medication',
      entityId: id,
      metadata: { changedFields: Object.keys(data) },
    });
    const current = await getAccessibleMedication(user.id, id);
    return NextResponse.json(current ? toMedication(current) : toMedication(medication));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, id } = await requestContext(params);
    const [medication] = await sql`
      DELETE FROM medications m
      USING patients p
      WHERE m.patient_id = p.id AND m.id = ${id}::uuid
        AND EXISTS (
          SELECT 1
          FROM household_patients hp
          INNER JOIN household_members hm
            ON hm.household_id = hp.household_id AND hm.user_id = ${user.id}
          WHERE hp.patient_id = p.id
        )
      RETURNING m.id, m.patient_id
    `;
    if (!medication) throw new AppError('Medication not found', 404);
    await recordAuditEvent({
      actorId: user.id,
      patientId: medication.patient_id,
      eventType: 'deleted',
      entityType: 'medication',
      entityId: id,
    });
    return NextResponse.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
