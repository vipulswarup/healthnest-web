'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';
import AppNav from '@/components/layout/AppNav';

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
  abhaNumber?: string;
  bloodGroup?: string;
  emergencyContacts: EmergencyContact[] | string[];
}

interface HealthRecord {
  id: string;
  recordType: string;
  source: string;
  tags: string[];
  documentDate?: string;
  createdAt: string;
  documentId?: string;
  data: Record<string, unknown>;
}

export default function PatientDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [categories, setCategories] = useState<HealthRecordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [error, setError] = useState('');

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

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patients/${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient');
      }
      const data = await response.json();
      setPatient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchHealthRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      const response = await fetch(`/api/health-records?patientId=${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health records');
      }
      const data = await response.json();
      setHealthRecords(data);
    } catch (err) {
      console.error('Error fetching health records:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    void fetchPatient();
    void fetchHealthRecords();
    void fetchCategories();
  }, [fetchCategories, fetchHealthRecords, fetchPatient, router, session, status]);

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

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNav />
        <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-red-600">{error || 'Patient not found'}</p>
              <Link
                href="/patients"
                className="mt-4 inline-block text-coral hover:text-coral-strong"
              >
                Back to family
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

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/patients"
              className="text-sm font-medium text-coral hover:underline"
            >
              ← Back to family
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/medications?patientId=${patientId}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Medications
              </Link>
              <Link
                href={`/health-records?patientId=${patientId}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                All records
              </Link>
            </div>
          </div>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {patient.firstName} {patient.lastName || ''}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Date of Birth</h3>
                <p className="text-gray-900">
                  {new Date(patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Gender</h3>
                <p className="text-gray-900">{patient.gender}</p>
              </div>

              {patient.bloodGroup && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Blood Group</h3>
                  <p className="text-gray-900">{patient.bloodGroup}</p>
                </div>
              )}

              {patient.abhaNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">ABHA Number</h3>
                  <p className="text-gray-900">{patient.abhaNumber}</p>
                </div>
              )}

              {patient.emergencyContacts.length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Emergency Contacts</h3>
                  <div className="space-y-2">
                    {patient.emergencyContacts.map((contact, index) => {
                      const isStructured = typeof contact === 'object' && 'name' in contact;
                      if (isStructured) {
                        const structuredContact = contact as EmergencyContact;
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-gray-900 font-medium">{structuredContact.name}</p>
                            <p className="text-sm text-gray-600">{structuredContact.phone}</p>
                            <p className="text-sm text-gray-500">{structuredContact.relation}</p>
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-600">{contact as string}</p>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Reports</h3>
              <Link
                href={`/health-records/new?patientId=${patientId}`}
                className="sv-btn sv-btn-primary"
              >
                Add a Report
              </Link>
            </div>

            {recordsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading records...</p>
              </div>
            ) : healthRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No reports yet</p>
                <Link
                  href={`/health-records/new?patientId=${patientId}`}
                  className="mt-4 inline-block text-coral hover:text-coral-strong"
                >
                  Add a Report
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {healthRecords.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {getRecordTypeLabel(record.recordType)}
                          </h4>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{record.source}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(record.documentDate || record.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        {record.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {record.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {record.documentId && (
                          <Link
                            href={`/health-records/${record.id}/document`}
                            className="text-sm text-coral hover:text-coral-strong inline-flex items-center cursor-pointer"
                          >
                            View document
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
