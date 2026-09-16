'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/layout/AppNav';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';

export default function NewPatientPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { householdId: activeHouseholdId, households, loading: householdsLoading, refresh } = useHouseholdContext();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scopeHouseholdId, setScopeHouseholdId] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    abhaNumber: '',
    bloodGroup: '',
    emergencyContacts: [] as Array<{ name: string; phone: string; relation: string }>,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    void refresh().finally(() => setReady(true));
  }, [session, status, router, refresh]);

  useEffect(() => {
    if (!ready || householdsLoading) return;
    if (households.length === 0) {
      router.push('/households');
      return;
    }
    setScopeHouseholdId(activeHouseholdId || households[0].id);
  }, [activeHouseholdId, households, householdsLoading, ready, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!scopeHouseholdId) {
      setError('Select a household');
      return;
    }
    setLoading(true);

    try {
      const emergencyContactsArray = formData.emergencyContacts
        .filter((contact) => contact.name.trim() && contact.phone.trim() && contact.relation.trim())
        .map((contact) => ({
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          relation: contact.relation.trim(),
        }));

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName || undefined,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          abhaNumber: formData.abhaNumber || undefined,
          bloodGroup: formData.bloodGroup || undefined,
          emergencyContacts: emergencyContactsArray.length > 0 ? emergencyContactsArray : undefined,
          householdId: scopeHouseholdId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create patient');
      router.push(`/patients/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || householdsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-3xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Person</h1>

            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4" role="alert">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="householdScope" className="block text-sm font-medium text-gray-700 mb-2">
                  Family folder *
                </label>
                <select
                  id="householdScope"
                  required
                  value={scopeHouseholdId}
                  onChange={(e) => setScopeHouseholdId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  This person will appear for everyone who can see this folder.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                  <select
                    id="gender"
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="abhaNumber" className="block text-sm font-medium text-gray-700 mb-2">ABHA number (optional)</label>
                  <input
                    type="text"
                    id="abhaNumber"
                    value={formData.abhaNumber}
                    onChange={(e) => setFormData({ ...formData, abhaNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <select
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-coral focus:border-transparent"
                  >
                    <option value="">Select blood group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link href="/patients" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-coral text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-coral-strong disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
