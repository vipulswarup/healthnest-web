'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function NewPatientPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName || undefined,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          abhaNumber: formData.abhaNumber || undefined,
          bloodGroup: formData.bloodGroup || undefined,
          emergencyContacts: emergencyContactsArray.length > 0 ? emergencyContactsArray : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create patient');
      }

      router.push(`/patients/${data.id}`);
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
              <h1 className="text-xl font-bold text-gray-900">HealthNest</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/patients"
                className="text-sm text-gray-700 hover:text-[#0175C2] transition-colors"
              >
                Back to Patients
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Patient</h2>

            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="abhaNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    ABHA Number
                  </label>
                  <input
                    type="text"
                    id="abhaNumber"
                    value={formData.abhaNumber}
                    onChange={(e) => setFormData({ ...formData, abhaNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                    placeholder="Ayushman Bharat Health Account"
                  />
                </div>

                <div>
                  <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Emergency Contacts
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        emergencyContacts: [
                          ...formData.emergencyContacts,
                          { name: '', phone: '', relation: '' },
                        ],
                      });
                    }}
                    className="text-sm text-[#0175C2] hover:text-[#015a96] font-medium transition-colors"
                  >
                    + Add Contact
                  </button>
                </div>
                {formData.emergencyContacts.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                    No emergency contacts added. Click "Add Contact" to add one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.emergencyContacts.map((contact, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Contact {index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                emergencyContacts: formData.emergencyContacts.filter(
                                  (_, i) => i !== index
                                ),
                              });
                            }}
                            className="text-sm text-red-600 hover:text-red-800 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor={`contact-name-${index}`}
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Name *
                            </label>
                            <input
                              type="text"
                              id={`contact-name-${index}`}
                              required
                              value={contact.name}
                              onChange={(e) => {
                                const updated = [...formData.emergencyContacts];
                                updated[index].name = e.target.value;
                                setFormData({ ...formData, emergencyContacts: updated });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent text-sm"
                              placeholder="Full name"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`contact-phone-${index}`}
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              id={`contact-phone-${index}`}
                              required
                              value={contact.phone}
                              onChange={(e) => {
                                const updated = [...formData.emergencyContacts];
                                updated[index].phone = e.target.value;
                                setFormData({ ...formData, emergencyContacts: updated });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent text-sm"
                              placeholder="Phone number"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`contact-relation-${index}`}
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Relation *
                            </label>
                            <input
                              type="text"
                              id={`contact-relation-${index}`}
                              required
                              value={contact.relation}
                              onChange={(e) => {
                                const updated = [...formData.emergencyContacts];
                                updated[index].relation = e.target.value;
                                setFormData({ ...formData, emergencyContacts: updated });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent text-sm"
                              placeholder="e.g., Spouse, Parent, Sibling"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link
                  href="/patients"
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#0175C2] text-white rounded-lg hover:bg-[#015a96] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
