'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';

interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  documentPath?: string;
  data: Record<string, any>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getRecordTypeLabel = (code: string): string => {
    const category = categories.find(cat => cat.code === code);
    return category?.displayName || code;
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchRecord();
    fetchCategories();
  }, [session, status, router, recordId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/health-record-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/health-records/${recordId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health record');
      }
      const data = await response.json();
      setRecord(data);
      
      if (data.patientId) {
        fetchPatient(data.patientId);
      }

      if (data.documentPath) {
        fetchSignedUrl(data.documentPath);
      } else {
        setError('No document attached to this health record');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatient = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
    }
  };

  const fetchSignedUrl = async (documentPath: string) => {
    try {
      const response = await fetch('/api/documents/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document URL');
      }

      const data = await response.json();
      setSignedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    }
  };

  const getFileType = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif'].includes(extension || '')) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    return 'unknown';
  };


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0175C2] mx-auto"></div>
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
                <h1 className="text-xl font-bold text-gray-900">HealthNest</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <p className="text-red-600">{error || 'Document not found'}</p>
              <div className="mt-4 space-x-4">
                <Link
                  href={`/health-records/${recordId}`}
                  className="inline-block text-[#0175C2] hover:text-[#015a96]"
                >
                  Back to Health Record
                </Link>
                <Link
                  href="/health-records"
                  className="inline-block text-[#0175C2] hover:text-[#015a96]"
                >
                  Back to Health Records
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const fileType = getFileType(record.documentPath || '');

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
                href={`/health-records/${recordId}`}
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                ← Back to Record
              </Link>
              <Link
                href="/health-records"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Health Records
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getRecordTypeLabel(record.recordType)} - {record.source}
                </h2>
                {patient && (
                  <p className="text-sm text-gray-600 mt-1">
                    Patient: {patient.firstName} {patient.lastName || ''}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors text-sm font-medium"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {fileType === 'image' ? (
              <div className="p-4">
                <img
                  src={signedUrl}
                  alt={`${getRecordTypeLabel(record.recordType)} document`}
                  className="max-w-full h-auto mx-auto rounded-lg"
                  onError={() => setError('Failed to load image')}
                />
              </div>
            ) : fileType === 'pdf' ? (
              <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="PDF Document"
                  allow="fullscreen"
                  onError={() => {
                    // Fallback to direct URL if Google viewer fails
                    const iframe = document.querySelector('iframe[title="PDF Document"]') as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = `${signedUrl}#toolbar=1&navpanes=1&scrollbar=1`;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors"
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

