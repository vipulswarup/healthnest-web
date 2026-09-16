'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';
import AppNav from '@/components/layout/AppNav';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button, buttonVariants } from '@heroui/react';

const DocumentSharePanel = dynamic(
  () => import('@/components/documents/DocumentSharePanel').then((mod) => mod.DocumentSharePanel),
  { ssr: false },
);

interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  source: string;
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

export default function DocumentPreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;

  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [categories, setCategories] = useState<HealthRecordCategory[]>([]);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [documentFileType, setDocumentFileType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readingPages, setReadingPages] = useState(false);
  const [readPagesMessage, setReadPagesMessage] = useState('');

  const getRecordTypeLabel = (code: string): string => {
    const category = categories.find(cat => cat.code === code);
    return category?.displayName || code;
  };

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

  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/health-records/${recordId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health record');
      }
      const data = await response.json();
      setRecord(data);
      
      if (data.patientId) {
        const patientResponse = await fetch(`/api/patients/${data.patientId}`);
        if (patientResponse.ok) setPatient(await patientResponse.json());
      }

      if (data.documentId) {
        const documentResponse = await fetch('/api/documents/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: data.documentId }),
        });
        if (!documentResponse.ok) throw new Error('Failed to generate document URL');
        const documentData = await documentResponse.json();
        setSignedUrl(documentData.url);
        setDownloadUrl(documentData.downloadUrl || documentData.url);
        setDocumentFileType(documentData.fileType || null);
      } else {
        setError('No document attached to this health record');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    void fetchRecord();
    void fetchCategories();
  }, [fetchCategories, fetchRecord, router, session, status]);


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !record || !signedUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNav />
        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-red-600">{error || 'Document not found'}</p>
              <div className="mt-4 space-x-4">
                <Link
                  href={`/health-records/${recordId}`}
                  className="inline-block text-coral hover:text-coral-strong"
                >
                  Back to this report
                </Link>
                <Link
                  href="/health-records"
                  className="inline-block text-coral hover:text-coral-strong"
                >
                  Back to reports
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const fileType = documentFileType?.startsWith('image/') ? 'image' : documentFileType === 'application/pdf' ? 'pdf' : 'unknown';

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />

      <main className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link
            href={`/health-records/${recordId}`}
            className="mb-4 inline-block text-sm font-medium text-coral hover:underline"
          >
            ← Back to record
          </Link>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {getRecordTypeLabel(record.recordType)} - {record.source}
                </h1>
                {patient && (
                  <p className="text-sm text-gray-600 mt-1">
                    Patient: {patient.firstName} {patient.lastName || ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {record.documentId ? (
                  <DocumentSharePanel
                    documentId={record.documentId}
                    documentLabel={getRecordTypeLabel(record.recordType)}
                    senderName={session.user?.name || session.user?.email || 'A family member'}
                  />
                ) : null}
                {fileType === 'pdf' && record.documentId ? (
                  <Button
                    variant="outline"
                    size="md"
                    className="min-h-12"
                    isDisabled={readingPages}
                    onPress={() => {
                      void (async () => {
                        setReadingPages(true);
                        setReadPagesMessage('');
                        try {
                          const response = await fetch('/api/ocr/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ documentId: record.documentId, mode: 'full' }),
                          });
                          const data = await response.json().catch(() => ({}));
                          if (!response.ok) throw new Error(data.error || 'Could not read all pages');
                          setReadPagesMessage('Finished reading all pages. Lab highlights will use this text on the next refresh.');
                        } catch (err) {
                          setReadPagesMessage(err instanceof Error ? err.message : 'Could not read all pages');
                        } finally {
                          setReadingPages(false);
                        }
                      })();
                    }}
                  >
                    {readingPages ? 'Reading pages…' : 'Read all pages'}
                  </Button>
                ) : null}
                <a
                  href={downloadUrl || signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonVariants({ variant: 'primary', size: 'md' })} inline-flex min-h-12 items-center justify-center`}
                >
                  Open in New Tab
                </a>
              </div>
            </div>
            {readPagesMessage ? (
              <p className="mt-3 text-sm text-gray-700" role="status">{readPagesMessage}</p>
            ) : null}
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {fileType === 'image' ? (
              <div className="p-4">
                <Image
                  src={signedUrl}
                  alt={`${getRecordTypeLabel(record.recordType)} document`}
                  width={1200}
                  height={1600}
                  unoptimized
                  className="max-w-full h-auto mx-auto rounded-lg"
                  onError={() => setError('Failed to load image')}
                />
              </div>
            ) : fileType === 'pdf' ? (
              <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0"
                  title="PDF Document"
                  allow="fullscreen"
                />
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <a
                  href={downloadUrl || signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-coral text-white rounded-lg hover:bg-coral-strong transition-colors"
                >
                  Download Document
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
