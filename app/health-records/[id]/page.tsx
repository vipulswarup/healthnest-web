'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RecordDataDisplay from '@/app/components/RecordDataDisplay';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';
import AppNav from '@/components/layout/AppNav';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { idTypeLabel, ID_DOCUMENT_TYPES } from '@/lib/constants/id-documents';

interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  source: string;
  doctorName?: string;
  documentDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  documentId?: string;
  data: Record<string, unknown>;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
}

type Draft = {
  recordType: string;
  source: string;
  doctorName: string;
  documentDate: string;
  idType: string;
  expiryDate: string;
  tags: string;
};

function toDateInput(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function draftFromRecord(record: HealthRecord): Draft {
  const data = record.data || {};
  return {
    recordType: record.recordType,
    source: record.source || '',
    doctorName: record.doctorName || '',
    documentDate: toDateInput(record.documentDate),
    idType: String(data.idType || ''),
    expiryDate: toDateInput(typeof data.expiryDate === 'string' ? data.expiryDate : ''),
    tags: (record.tags || []).join(', '),
  };
}

export default function HealthRecordDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { notify } = useToast();
  const params = useParams();
  const recordId = params.id as string;

  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [categories, setCategories] = useState<HealthRecordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reassignPatientId, setReassignPatientId] = useState('');

  const getRecordTypeLabel = (code: string): string => {
    const category = categories.find(cat => cat.code === code);
    return category?.displayName || code;
  };

  const needsReview = Boolean(record?.tags?.includes('needs_review'));

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/health-record-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) setPatients(await response.json());
    } catch {
      // Non-critical for view mode.
    }
  }, []);

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/health-records/${recordId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health record');
      }
      const data = await response.json();
      setRecord(data);
      setReassignPatientId(data.patientId || '');
      
      if (data.patientId) {
        const patientResponse = await fetch(`/api/patients/${data.patientId}`);
        if (patientResponse.ok) setPatient(await patientResponse.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (status === 'authenticated') {
      void fetchCategories();
      void fetchPatients();
      void fetchRecord();
    }
  }, [status, router, fetchCategories, fetchPatients, fetchRecord]);

  const handleApproveReview = async () => {
    if (!record) return;
    setApproving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { approveReview: true };
      if (reassignPatientId && reassignPatientId !== record.patientId) {
        payload.patientId = reassignPatientId;
      }
      const response = await fetch(`/api/health-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as HealthRecord & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not confirm');
      setRecord(body);
      if (body.patientId) {
        const patientResponse = await fetch(`/api/patients/${body.patientId}`);
        if (patientResponse.ok) setPatient(await patientResponse.json());
      }
      notify('Marked as reviewed.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm');
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/health-records/${recordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete health record');
      }

      notify('Health record deleted.', 'success');
      router.push(record?.patientId ? `/health-records?patientId=${record.patientId}` : '/health-records');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete health record', 'error');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const startEdit = () => {
    if (!record) return;
    setDraft(draftFromRecord(record));
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!record || !draft) return;
    setSaving(true);
    setError('');
    try {
      const tags = draft.tags.split(',').map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
      const isId = draft.recordType === 'ID_DOCUMENT';
      const payload: Record<string, unknown> = {
        recordType: draft.recordType,
        source: draft.source.trim() || (isId ? 'Issuing authority not specified' : 'Not specified'),
        documentDate: draft.documentDate || undefined,
        tags,
      };
      if (isId) {
        payload.doctorName = '';
        payload.data = {
          ...(record.data || {}),
          idType: draft.idType || undefined,
          expiryDate: draft.expiryDate || undefined,
        };
      } else {
        payload.doctorName = draft.doctorName.trim();
      }

      const response = await fetch(`/api/health-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as HealthRecord & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save changes');
      setRecord(body);
      setEditing(false);
      setDraft(null);
      notify('Saved.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNav />
        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-red-600">{error || 'Health record not found'}</p>
              <Link
                href="/health-records"
                className="mt-4 inline-block text-coral hover:text-coral-strong"
              >
                Back to reports
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />

      <main className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link
            href={record.patientId ? `/health-records?patientId=${record.patientId}` : '/health-records'}
            className="mb-5 inline-block text-sm font-medium text-coral hover:underline"
          >
            ← Back to health records
          </Link>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            {needsReview && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">Needs review</p>
                <p className="mt-1 text-sm text-amber-800">
                  This report arrived via WhatsApp. Confirm the person and details, then mark it reviewed.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="reassign-patient" className="mb-1 block text-xs font-medium text-amber-900">
                      Filed for
                    </label>
                    <select
                      id="reassign-patient"
                      value={reassignPatientId}
                      onChange={(e) => setReassignPatientId(e.target.value)}
                      className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={approving}
                    onClick={() => void handleApproveReview()}
                    className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                  >
                    {approving ? 'Saving…' : 'Confirm filing'}
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {getRecordTypeLabel(record.recordType)}
                </h2>
                {patient && (
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-sm text-coral hover:text-coral-strong transition-colors"
                  >
                    Patient: {patient.firstName} {patient.lastName || ''}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-strong disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
                <button
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Delete
              </button>
              </div>
            </div>

            {error && editing && (
              <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Record type</h3>
                  {editing && draft ? (
                    <select
                      value={draft.recordType}
                      onChange={(e) => setDraft({ ...draft, recordType: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    >
                      {categories.map((category) => (
                        <option key={category.code} value={category.code}>{category.displayName}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{getRecordTypeLabel(record.recordType)}</p>
                  )}
                </div>

                {(editing ? draft?.recordType === 'ID_DOCUMENT' : record.recordType === 'ID_DOCUMENT') ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">ID type</h3>
                      {editing && draft ? (
                        <select
                          value={draft.idType}
                          onChange={(e) => setDraft({ ...draft, idType: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        >
                          <option value="">Choose one</option>
                          {ID_DOCUMENT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900">{idTypeLabel(String(record.data?.idType || '')) || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Issuing authority</h3>
                      {editing && draft ? (
                        <input
                          value={draft.source}
                          onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.source}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Issued date</h3>
                      {editing && draft ? (
                        <input
                          type="date"
                          value={draft.documentDate}
                          onChange={(e) => setDraft({ ...draft, documentDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.documentDate ? formatDateOnly(record.documentDate) : 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Expiry date</h3>
                      {editing && draft ? (
                        <input
                          type="date"
                          value={draft.expiryDate}
                          onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{typeof record.data?.expiryDate === 'string' && record.data.expiryDate ? formatDateOnly(String(record.data.expiryDate)) : 'Not specified'}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Hospital or clinic</h3>
                      {editing && draft ? (
                        <input
                          value={draft.source}
                          onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.source}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Doctor</h3>
                      {editing && draft ? (
                        <input
                          value={draft.doctorName}
                          onChange={(e) => setDraft({ ...draft, doctorName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.doctorName || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Document date</h3>
                      {editing && draft ? (
                        <input
                          type="date"
                          value={draft.documentDate}
                          onChange={(e) => setDraft({ ...draft, documentDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.documentDate ? formatDateOnly(record.documentDate) : 'Not specified'}</p>
                      )}
                    </div>
                    {record.hospitalSystemName && !editing && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Hospital System</h3>
                        <p className="text-gray-900">{record.hospitalSystemName}</p>
                      </div>
                    )}
                    {record.hospitalIdentifierValue && !editing && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Hospital Identifier</h3>
                        <p className="text-gray-900">
                          {record.hospitalIdentifierType}: {record.hospitalIdentifierValue}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Created at</h3>
                  <p className="text-gray-900">{formatDate(record.createdAt)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Last updated</h3>
                  <p className="text-gray-900">{formatDate(record.updatedAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                {editing && draft ? (
                  <input
                    value={draft.tags}
                    onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                    placeholder="xray, skull, pediatric"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                ) : record.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-900">None</p>
                )}
              </div>

              {record.documentId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Document</h3>
                  <Link
                    href={`/health-records/${recordId}/document`}
                    className="inline-flex items-center text-coral hover:text-coral-strong transition-colors cursor-pointer"
                  >
                    <span className="mr-2">📄</span>
                    View Document
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              )}

              {record.data && Object.keys(record.data).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Record Details</h3>
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <RecordDataDisplay data={record.data} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete this health record?"
        description="This permanently removes the record and its extracted health information. The action cannot be undone."
        confirmLabel="Delete record"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
