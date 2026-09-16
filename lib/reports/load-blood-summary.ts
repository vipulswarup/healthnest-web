import { sql } from '@/lib/db/neon';
import {
  buildBloodReportSummary,
  hasManualLabOverride,
  LAB_METRIC_OPTIONS,
  LabAliasMapping,
  parseBloodResults,
  readManualLabResults,
} from '@/lib/reports/blood-summary';
import type { LatestLabCandidate } from '@/lib/reports/doctor-packet';

export const BLOOD_SUMMARY_LOOKBACK_DAYS = 90;

const LAB_RECORD_TYPES = new Set([
  'LAB_REPORT',
  'PATHOLOGY_TEST',
  'HEMATOLOGY_REPORT',
  'BIOCHEMISTRY_REPORT',
]);

function isLabLikeRecord(recordType: string, tags: string[]) {
  if (LAB_RECORD_TYPES.has(recordType)) return true;
  return tags.some((tag) =>
    /(blood|lab|pathology|haemat|hemat|cbc|lipid|thyroid|kidney|liver|iron|urine|diabetes|glucose)/i.test(tag),
  );
}

export async function loadBloodSummaryForPatient(patientId: string) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - BLOOD_SUMMARY_LOOKBACK_DAYS);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const periodEndIso = periodEnd.toISOString().slice(0, 10);

  const records = await sql`
    SELECT
      hr.id,
      hr.source,
      hr.record_type,
      hr.tags,
      hr.data,
      CASE
        WHEN COALESCE(length(d.ocr_text), 0) >= COALESCE(length(hr.ocr_text), 0) THEN d.ocr_text
        ELSE hr.ocr_text
      END AS ocr_text,
      hr.document_id,
      hr.document_date,
      hr.created_at,
      COALESCE(hr.document_date, hr.created_at::date) AS effective_date
    FROM health_records hr
    LEFT JOIN documents d ON d.id = hr.document_id
    WHERE hr.patient_id = ${patientId}::uuid
      AND COALESCE(hr.document_date, hr.created_at::date) BETWEEN ${periodStartIso}::date AND ${periodEndIso}::date
      AND (
        hr.record_type IN ('LAB_REPORT', 'PATHOLOGY_TEST', 'HEMATOLOGY_REPORT', 'BIOCHEMISTRY_REPORT')
        OR EXISTS (
          SELECT 1
          FROM unnest(hr.tags) AS tag
          WHERE tag ~* '(blood|lab|pathology|haemat|hemat|cbc|lipid|thyroid|kidney|liver|iron|urine|diabetes|glucose)'
        )
        OR hr.ocr_text ~* '(hemoglobin|haemoglobin|creatinine|hba1c|triglyceride|cholesterol|tsh|platelet|ferritin)'
        OR d.ocr_text ~* '(hemoglobin|haemoglobin|creatinine|hba1c|triglyceride|cholesterol|tsh|platelet|ferritin)'
        OR (hr.data ? 'labResultsManual' AND (hr.data->>'labResultsManual') = 'true')
      )
    ORDER BY effective_date DESC, hr.created_at DESC
  `;

  const confirmedMappingRows = await sql`
    SELECT source, data
    FROM health_records
    WHERE patient_id = ${patientId}::uuid
      AND data ? 'labResultsManual'
      AND (data->>'labResultsManual') = 'true'
  `;
  const canonicalMetrics = new Set(LAB_METRIC_OPTIONS.map((option) => option.metric));
  const mappingsBySource = new Map<string, Map<string, LabAliasMapping>>();
  for (const row of confirmedMappingRows) {
    const source = String(row.source || 'Unknown source').trim().toLowerCase();
    const sourceMappings = mappingsBySource.get(source) || new Map<string, LabAliasMapping>();
    for (const result of readManualLabResults(row.data || {})) {
      if (!result.rawLabel || !canonicalMetrics.has(result.metric)) continue;
      sourceMappings.set(result.rawLabel.trim().toLowerCase(), {
        rawLabel: result.rawLabel,
        metric: result.metric,
      });
    }
    mappingsBySource.set(source, sourceMappings);
  }

  const mapped = records.map((record) => {
    const data = record.data || {};
    const useManualResults = hasManualLabOverride(data);
    const source = String(record.source || 'Unknown source');
    const ocrText = record.ocr_text ? String(record.ocr_text) : '';
    const tags = Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : [];
    return {
      id: String(record.id),
      date: new Date(record.effective_date || record.document_date || record.created_at),
      source,
      recordType: String(record.record_type || ''),
      tags,
      documentPath: record.document_id
        ? `/health-records/${record.id}/document`
        : `/health-records/${record.id}`,
      ocrText: ocrText || undefined,
      useManualResults,
      manualResults: useManualResults ? readManualLabResults(data) : undefined,
      aliasMappings: [...(mappingsBySource.get(source.trim().toLowerCase())?.values() || [])],
    };
  });

  const summary = buildBloodReportSummary(mapped);
  const latestLab = mapped.find((record) => isLabLikeRecord(record.recordType, record.tags)) || mapped[0];
  const latestCandidate: LatestLabCandidate | null = latestLab
    ? {
        id: latestLab.id,
        date: latestLab.date,
        source: latestLab.source,
        resultCount: (latestLab.useManualResults ? latestLab.manualResults : parseBloodResults(latestLab.ocrText || '', latestLab.aliasMappings))?.length || 0,
        ocrChars: (latestLab.ocrText || '').length,
        documentPath: latestLab.documentPath,
      }
    : null;

  return {
    periodStart,
    periodEnd,
    lookbackDays: BLOOD_SUMMARY_LOOKBACK_DAYS,
    candidateReportCount: records.length,
    latestCandidate,
    ...summary,
  };
}
