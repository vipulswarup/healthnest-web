'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Patient {
  id: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
  abhaNumber?: string;
  bloodGroup?: string;
}

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setLoading(true);
      const response = await fetch('/api/patients');
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/patients/new"
                className="px-4 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors text-sm font-medium"
              >
                Add Patient
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {patients.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No patients yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Add your first patient to start managing health records
                </p>
                <Link
                  href="/patients/new"
                  className="inline-block px-6 py-3 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors font-medium"
                >
                  Add Your First Patient
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-blue-100 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName || ''}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-2xl">👤</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Gender:</span>
                        {patient.gender}
                      </div>
                      {patient.bloodGroup && (
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium mr-2">Blood Group:</span>
                          {patient.bloodGroup}
                        </div>
                      )}
                      {patient.abhaNumber && (
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium mr-2">ABHA:</span>
                          {patient.abhaNumber}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
