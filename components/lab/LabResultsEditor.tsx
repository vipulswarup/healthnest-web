'use client';

import { useState } from 'react';
import {
  LAB_METRIC_OPTIONS,
  LabResult,
  valueStatus,
} from '@/lib/reports/blood-summary';

type DraftRow = {
  localId: string;
  metric: string;
  label: string;
  rawLabel?: string;
  panel: LabResult['panel'];
  value: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  referenceText: string;
  status: LabResult['status'];
  mappingConfidence: LabResult['mappingConfidence'];
};

function toDraft(results: LabResult[]): DraftRow[] {
  return results.map((result, index) => ({
    localId: `${result.metric}-${index}`,
    metric: result.metric,
    label: result.label,
    rawLabel: result.rawLabel,
    panel: result.panel,
    value: result.rawValue || (result.value === null ? '' : String(result.value)),
    unit: result.unit || '',
    referenceLow: result.referenceLow === null || result.referenceLow === undefined ? '' : String(result.referenceLow),
    referenceHigh: result.referenceHigh === null || result.referenceHigh === undefined ? '' : String(result.referenceHigh),
    referenceText: result.referenceText || '',
    status: result.status,
    mappingConfidence: result.mappingConfidence,
  }));
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toLabResults(drafts: DraftRow[]): LabResult[] {
  const byMetric = new Map<string, LabResult>();
  for (const draft of drafts) {
    const option = LAB_METRIC_OPTIONS.find((item) => item.metric === draft.metric);
    const value = parseOptionalNumber(draft.value);
    const trimmedValue = draft.value.trim();
    if (!trimmedValue) continue;
    const rangeMatch = trimmedValue.match(/^(-?\d+(?:[,.]\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:[,.]\d+)?)$/i);
    const referenceLow = parseOptionalNumber(draft.referenceLow);
    const referenceHigh = parseOptionalNumber(draft.referenceHigh);
    const unit = draft.unit.trim() || null;
    byMetric.set(draft.metric, {
      metric: draft.metric,
      label: option?.label || draft.label,
      panel: option?.panel || draft.panel,
      value,
      valueType: 'numeric',
      rawValue: trimmedValue,
      rangeValueLow: rangeMatch ? Number(rangeMatch[1].replace(',', '.')) : null,
      rangeValueHigh: rangeMatch ? Number(rangeMatch[2].replace(',', '.')) : null,
      unit,
      referenceLow,
      referenceHigh,
      referenceText: draft.referenceText.trim() || null,
      rawLabel: draft.rawLabel,
      mappingConfidence: draft.mappingConfidence || (option ? 'verified' : 'unmapped'),
      status: draft.status === 'unknown' && value !== null
        ? valueStatus(value, referenceLow, referenceHigh)
        : draft.status,
    });
    const saved = byMetric.get(draft.metric)!;
    saved.valueType = value !== null ? 'numeric' : rangeMatch ? 'range' : 'qualitative';
  }
  return [...byMetric.values()];
}

interface LabResultsEditorProps {
  results: LabResult[];
  onChange: (results: LabResult[]) => void;
  disabled?: boolean;
}

export function LabResultsEditor({ results, onChange, disabled = false }: LabResultsEditorProps) {
  const [drafts, setDrafts] = useState<DraftRow[]>(() => toDraft(results));

  const usedMetrics = new Set(drafts.map((row) => row.metric));
  const availableToAdd = LAB_METRIC_OPTIONS.filter((item) => !usedMetrics.has(item.metric));

  const commit = (next: DraftRow[]) => {
    setDrafts(next);
    const sanitized = toLabResults(next);
    onChange(sanitized);
  };

  const updateRow = (localId: string, patch: Partial<DraftRow>) => {
    commit(drafts.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  };

  const removeRow = (localId: string) => {
    commit(drafts.filter((row) => row.localId !== localId));
  };

  const addRow = () => {
    const nextMetric = availableToAdd[0];
    if (!nextMetric) return;
    commit([
      ...drafts,
      {
        localId: `${nextMetric.metric}-${Date.now()}`,
        metric: nextMetric.metric,
        label: nextMetric.label,
        rawLabel: nextMetric.label,
        panel: nextMetric.panel,
        value: '',
        unit: '',
        referenceLow: '',
        referenceHigh: '',
        referenceText: '',
        status: 'unknown',
        mappingConfidence: 'verified',
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Test</th>
              <th className="px-3 py-2 font-medium">Reference text</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Ref low</th>
              <th className="px-3 py-2 font-medium">Ref high</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {drafts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-slate-500">
                  No lab values yet. Add a test, or keep using auto-extraction.
                </td>
              </tr>
            ) : (
              drafts.map((row) => (
                <tr key={row.localId}>
                  <td className="px-3 py-2">
                    <select
                      name={`labMetric-${row.localId}`}
                      aria-label="Lab test"
                      value={row.metric}
                      disabled={disabled}
                      onChange={(e) => {
                        const option = LAB_METRIC_OPTIONS.find((item) => item.metric === e.target.value);
                        updateRow(row.localId, {
                          metric: e.target.value,
                          ...(option ? { label: option.label, panel: option.panel, mappingConfidence: 'verified' as const } : {}),
                        });
                      }}
                      className="w-full min-w-[10rem] rounded-md border border-slate-300 px-2 py-1.5"
                    >
                      {LAB_METRIC_OPTIONS.filter(
                        (option) => option.metric === row.metric || !usedMetrics.has(option.metric),
                      ).map((option) => (
                        <option key={option.metric} value={option.metric}>
                          {option.label}
                        </option>
                      ))}
                      {!LAB_METRIC_OPTIONS.some((option) => option.metric === row.metric) && (
                        <option value={row.metric}>{row.label} (as reported)</option>
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name={`labReferenceText-${row.localId}`}
                      aria-label="Reference text"
                      value={row.referenceText}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { referenceText: e.target.value })}
                      className="w-36 rounded-md border border-slate-300 px-2 py-1.5"
                      placeholder="As reported"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      name={`labStatus-${row.localId}`}
                      aria-label="Lab result status"
                      value={row.status}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { status: e.target.value as LabResult['status'] })}
                      className="rounded-md border border-slate-300 px-2 py-1.5"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                      <option value="abnormal">Abnormal</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name={`labValue-${row.localId}`}
                      aria-label="Lab result value"
                      inputMode="decimal"
                      value={row.value}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { value: e.target.value })}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name={`labUnit-${row.localId}`}
                      aria-label="Lab result unit"
                      value={row.unit}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { unit: e.target.value })}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
                      placeholder="mg/dL"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name={`labReferenceLow-${row.localId}`}
                      aria-label="Reference range low"
                      inputMode="decimal"
                      value={row.referenceLow}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { referenceLow: e.target.value })}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name={`labReferenceHigh-${row.localId}`}
                      aria-label="Reference range high"
                      inputMode="decimal"
                      value={row.referenceHigh}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.localId, { referenceHigh: e.target.value })}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeRow(row.localId)}
                      className="text-sm text-rose-700 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        disabled={disabled || availableToAdd.length === 0}
        onClick={addRow}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add test
      </button>
    </div>
  );
}
