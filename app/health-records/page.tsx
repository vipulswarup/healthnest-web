'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  tags: string[];
  documentPath?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
}

export default function HealthRecordsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [categories, setCategories] = useState<HealthRecordCategory[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
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

    fetchPatients();
    fetchCategories();
  }, [session, status, router]);

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

  useEffect(() => {
    if (selectedPatientId) {
      fetchRecords(selectedPatientId);
    } else {
      setRecords([]);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      const data = await response.json();
      const patientsMap: Record<string, Patient> = {};
      data.forEach((p: Patient) => {
        patientsMap[p.id] = p;
      });
      setPatients(patientsMap);
      
      // Auto-select first patient if available
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (patientId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/health-records?patientId=${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health records');
      }
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this health record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/health-records/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete health record');
      }

      if (selectedPatientId) {
        fetchRecords(selectedPatientId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete health record');
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };


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
                href="/dashboard"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/patients"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Patients
              </Link>
              <Link
                href="/health-records"
                className="text-sm font-medium text-[#0175C2]"
              >
                Health Records
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Health Records</h2>
            {selectedPatientId && (
              <Link
                href={`/health-records/new?patientId=${selectedPatientId}`}
                className="bg-[#0175C2] hover:bg-[#015a96] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Add Record
              </Link>
            )}
          </div>

          {Object.keys(patients).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No patients found
              </h3>
              <p className="text-gray-600 mb-6">
                You need to add a patient first before creating health records.
              </p>
              <Link
                href="/patients/new"
                className="inline-block bg-[#0175C2] hover:bg-[#015a96] text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Add Patient
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient
                </label>
                <select
                  id="patient"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                >
                  {Object.values(patients).map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName || ''}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {records.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No health records yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start by adding a health record for this patient.
                  </p>
                  {selectedPatientId && (
                    <Link
                      href={`/health-records/new?patientId=${selectedPatientId}`}
                      className="inline-block bg-[#0175C2] hover:bg-[#015a96] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Add Health Record
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {getRecordTypeLabel(record.recordType)}
                            </h3>
                            {record.documentPath && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Has Document
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Source: {record.source}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(record.createdAt)}
                          </p>
                          {record.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {record.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Link
                            href={`/health-records/${record.id}`}
                            className="bg-blue-50 hover:bg-blue-100 text-[#0175C2] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

