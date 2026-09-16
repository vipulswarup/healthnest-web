import { sql } from '@/lib/db/neon';

export type AuditEventInput = {
  actorId: string;
  patientId?: string | null;
  eventType: 'created' | 'updated' | 'deleted';
  entityType: 'patient' | 'health_record' | 'document' | 'medication';
  entityId: string;
  /**
   * Keep this deliberately non-sensitive. Metadata may describe an operation
   * (for example, changed field names), but must never contain PHI values.
   */
  metadata?: Record<string, string | number | boolean | string[]>;
};

/** Records a server-authoritative audit event for a PHI-affecting mutation. */
export async function recordAuditEvent({
  actorId,
  patientId = null,
  eventType,
  entityType,
  entityId,
  metadata = {},
}: AuditEventInput): Promise<void> {
  await sql`
    INSERT INTO audit_events (actor_id, patient_id, event_type, entity_type, entity_id, metadata)
    VALUES (
      ${actorId},
      ${patientId}::uuid,
      ${eventType},
      ${entityType},
      ${entityId},
      ${JSON.stringify(metadata)}::jsonb
    )
  `;
}
