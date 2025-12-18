'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DEFAULT_TAGS, RECORD_TYPES } from '@/lib/constants/tags';
import { getRecordTypeOptions } from '@/lib/constants/labels';
import { DocumentUploader } from '@/components/documents/DocumentUploader';

function NewHealthRecordContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<Array<{ id: string; firstName: string; lastName?: string }>>([]);
  const [uploadedDocument, setUploadedDocument] = useState<{ id: string; fileUrl: string; fileName: string } | null>(null);

  const [formData, setFormData] = useState({
    patientId: patientId,
    recordType: (RECORD_TYPES[0] || '') as string,
    source: '',
    tags: [] as string[],
    data: {} as Record<string, any>,
    documentPath: '',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchPatients();
  }, [session, status, router]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      const data = await response.json();
      setPatients(data);

      if (patientId && !formData.patientId) {
        setFormData({ ...formData, patientId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.includes(tag)
        ? formData.tags.filter((t) => t !== tag)
        : [...formData.tags, tag],
    });
  };

  const handleDocumentUploadSuccess = async (doc: any) => {
    setUploadedDocument(doc);
    setFormData({
      ...formData,
      documentPath: doc.fileUrl,
    });

    // Auto-process document
    try {
      console.log('Starting auto-process for document:', doc.id);

      // 1. Trigger OCR
      const ocrRes = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });
      if (!ocrRes.ok) throw new Error('OCR failed');
      const ocrData = await ocrRes.json();
      console.log('OCR Complete');

      // 2. Trigger Unified Analysis (Classification + Tags + Source)
      const analyzeRes = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        console.log('Analysis Result:', analyzeData);

        setFormData(prev => {
          let newData = { ...prev };

          // 1. Auto-select record type
          if (analyzeData.classification) {
            const options = getRecordTypeOptions();
            const matchedOption = options.find(o => o.label === analyzeData.classification);
            if (matchedOption) {
              newData.recordType = matchedOption.value;
            }
          }

          // 2. Auto-populate Source
          if (analyzeData.source) {
            newData.source = analyzeData.source;
          }

          // 3. Auto-populate Tags
          if (analyzeData.tags && Array.isArray(analyzeData.tags)) {
            newData.tags = Array.from(new Set([...newData.tags, ...analyzeData.tags]));
          }

          return newData;
        });
      }

    } catch (error) {
      console.error('Auto-processing failed:', error);
      // Non-blocking error, user can still edit manually
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.patientId) {
      setError('Please select a patient');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/health-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          data: formData.data || {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create health record');
      }

      router.push(`/health-records?patientId=${formData.patientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0175C2] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Image
                  src="/android-chrome-512x512.png"
                  alt="HealthNest Logo"
                  width={40}
                  height={40}
                  className="rounded-full cursor-pointer"
                />
              </Link>
              <Link href="/dashboard">
                <h1 className="text-xl font-bold text-gray-900 cursor-pointer">HealthNest</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/health-records"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                ← Back to Health Records
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Health Record</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Document (Optional)
                </label>
                {uploadedDocument ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{uploadedDocument.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedDocument(null);
                        setFormData({ ...formData, documentPath: '' });
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <DocumentUploader onUploadSuccess={handleDocumentUploadSuccess} />
                )}
                {uploadedDocument && (
                  <p className="mt-1 text-xs text-gray-500">File attached. It will be classified by AI after verification.</p>
                )}
              </div>

              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  id="patientId"
                  required
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                >
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="recordType" className="block text-sm font-medium text-gray-700 mb-2">
                  Record Type *
                </label>
                <select
                  id="recordType"
                  required
                  value={formData.recordType}
                  onChange={(e) => setFormData({ ...formData, recordType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                >
                  {getRecordTypeOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
                  Source (Hospital/Provider) *
                </label>
                <input
                  type="text"
                  id="source"
                  required
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., AIIMS, Max Healthcare"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${formData.tags.includes(tag)
                        ? 'bg-[#0175C2] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#0175C2] hover:bg-[#015a96] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Health Record'}
                </button>
                <Link
                  href="/health-records"
                  className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NewHealthRecordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0175C2] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <NewHealthRecordContent />
    </Suspense>
  );
}
