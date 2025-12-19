'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import RecordDataDisplay from '@/app/components/RecordDataDisplay';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';

interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  source: string;
  doctorName?: string;
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

export default function HealthRecordDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;

  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [categories, setCategories] = useState<HealthRecordCategory[]>([]);
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this health record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/health-records/${recordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete health record');
      }

      router.push('/health-records');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete health record');
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

  if (status === 'loading' || loading) {
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

  if (error || !record) {
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
              <p className="text-red-600">{error || 'Health record not found'}</p>
              <Link
                href="/health-records"
                className="mt-4 inline-block text-[#0175C2] hover:text-[#015a96]"
              >
                Back to Health Records
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
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

      <main className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {getRecordTypeLabel(record.recordType)}
                </h2>
                {patient && (
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-sm text-[#0175C2] hover:text-[#015a96] transition-colors"
                  >
                    Patient: {patient.firstName} {patient.lastName || ''}
                  </Link>
                )}
              </div>
              <button
                onClick={handleDelete}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Delete
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Source</h3>
                  <p className="text-gray-900">{record.source}</p>
                </div>

                {record.doctorName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Doctor</h3>
                    <p className="text-gray-900">{record.doctorName}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Record Type</h3>
                  <p className="text-gray-900">{getRecordTypeLabel(record.recordType)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Created At</h3>
                  <p className="text-gray-900">{formatDate(record.createdAt)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
                  <p className="text-gray-900">{formatDate(record.updatedAt)}</p>
                </div>

                {record.hospitalSystemName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Hospital System</h3>
                    <p className="text-gray-900">{record.hospitalSystemName}</p>
                  </div>
                )}

                {record.hospitalIdentifierValue && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Hospital Identifier</h3>
                    <p className="text-gray-900">
                      {record.hospitalIdentifierType}: {record.hospitalIdentifierValue}
                    </p>
                  </div>
                )}
              </div>

              {record.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {record.documentPath && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Document</h3>
                  <Link
                    href={`/health-records/${recordId}/document`}
                    className="inline-flex items-center text-[#0175C2] hover:text-[#015a96] transition-colors cursor-pointer"
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
    </div>
  );
}

