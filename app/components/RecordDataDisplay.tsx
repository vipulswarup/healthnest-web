'use client';

import { ReactElement } from 'react';
import { LabResult, sanitizeLabResults } from '@/lib/reports/blood-summary';

interface RecordDataDisplayProps {
  data: Record<string, unknown>;
}

const LAB_METADATA_KEYS = new Set(['labResults', 'labResultsManual', 'labResultsEditedAt']);
const ID_METADATA_KEYS = new Set(['idType', 'expiryDate']);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim() || '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function renderDataItem(key: string, value: unknown, level = 0): ReactElement | null {
  if (isEmptyValue(value)) return null;

  const indentStyle = level > 0 ? { marginLeft: `${level * 1.5}rem` } : {};
  const formattedKey = formatKey(key);

  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const entries = Object.entries(value).filter(([, nestedValue]) => !isEmptyValue(nestedValue));
    if (entries.length === 0) return null;

    return (
      <div key={key} className="mb-3" style={indentStyle}>
        <h4 className="mb-2 font-semibold text-gray-800">{formattedKey}</h4>
        <div className="space-y-2 border-l-2 border-gray-200 pl-4">
          {entries.map(([nestedKey, nestedValue]) => renderDataItem(nestedKey, nestedValue, level + 1))}
        </div>
      </div>
    );
  }

  return (
    <div key={key} className="mb-2" style={indentStyle}>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <span className="mb-1 min-w-[140px] font-medium text-gray-700 sm:mb-0">{formattedKey}:</span>
        <span className="flex-1 break-words text-gray-900">{formatValue(value)}</span>
      </div>
    </div>
  );
}

function referenceRange(result: LabResult): string {
  if (result.referenceText) return result.referenceText;
  if (result.referenceLow !== null && result.referenceHigh !== null) {
    return `${result.referenceLow} – ${result.referenceHigh}`;
  }
  if (result.referenceLow !== null) return `≥ ${result.referenceLow}`;
  if (result.referenceHigh !== null) return `≤ ${result.referenceHigh}`;
  return '—';
}

function statusStyle(status: LabResult['status']) {
  if (status === 'low') return 'bg-amber-100 text-amber-800';
  if (status === 'high') return 'bg-rose-100 text-rose-800';
  if (status === 'abnormal') return 'bg-rose-100 text-rose-800';
  if (status === 'normal') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

function statusLabel(status: LabResult['status']) {
  return status === 'unknown' ? 'No range' : status[0].toUpperCase() + status.slice(1);
}

function formatEditedAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function LabResultsTable({ results, manuallyConfirmed, editedAt }: {
  results: LabResult[];
  manuallyConfirmed: boolean;
  editedAt: unknown;
}) {
  const editedLabel = formatEditedAt(editedAt);

  return (
    <section aria-labelledby="lab-results-heading" className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 id="lab-results-heading" className="font-semibold text-gray-900">Lab results</h4>
        {manuallyConfirmed && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Manually confirmed</span>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Test</th>
              <th scope="col" className="px-4 py-3 font-medium">Result</th>
              <th scope="col" className="px-4 py-3 font-medium">Reference range</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((result) => (
              <tr key={result.metric}>
                <td className="px-4 py-3 font-medium text-slate-900">{result.label}</td>
                <td className="px-4 py-3 text-slate-800">{result.rawValue || result.value}{result.unit ? ` ${result.unit}` : ''}</td>
                <td className="px-4 py-3 text-slate-700">{referenceRange(result)}{result.unit && (result.referenceLow !== null || result.referenceHigh !== null) ? ` ${result.unit}` : ''}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(result.status)}`}>{statusLabel(result.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editedLabel && <p className="mt-2 text-xs text-slate-500">Last edited: {editedLabel}</p>}
    </section>
  );
}

export default function RecordDataDisplay({ data }: RecordDataDisplayProps) {
  const results = sanitizeLabResults(data.labResults);
  const genericEntries = Object.entries(data).filter(
    ([key, value]) => !LAB_METADATA_KEYS.has(key) && !ID_METADATA_KEYS.has(key) && !isEmptyValue(value),
  );

  if (results.length === 0 && genericEntries.length === 0) {
    return <div className="text-sm italic text-gray-500">No additional data available</div>;
  }

  return (
    <div className="space-y-3">
      {results.length > 0 && (
        <LabResultsTable
          results={results}
          manuallyConfirmed={data.labResultsManual === true}
          editedAt={data.labResultsEditedAt}
        />
      )}
      {genericEntries.map(([key, value]) => renderDataItem(key, value))}
    </div>
  );
}
