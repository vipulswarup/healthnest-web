'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HealthRecordCategory } from '@/lib/types/health-record-category.types';
import { HealthcareSource } from '@/lib/types/healthcare-source.types';

interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  source: string;
  doctorName?: string;
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
  const [sources, setSources] = useState<HealthcareSource[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search and filter state
  const [keyword, setKeyword] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
    fetchSources();
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

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/healthcare-sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRecords();
    }, keyword ? 300 : 0); // Debounce keyword search by 300ms

    return () => clearTimeout(timeoutId);
  }, [selectedPatientId, keyword, filterSource, filterRecordType, filterTag, startDate, endDate]);

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
      
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true);
      const params = new URLSearchParams();
      
      if (selectedPatientId) {
        params.append('patientId', selectedPatientId);
      }
      if (keyword) {
        params.append('keyword', keyword);
      }
      if (filterSource) {
        params.append('source', filterSource);
      }
      if (filterRecordType) {
        params.append('recordType', filterRecordType);
      }
      if (filterTag) {
        params.append('tag', filterTag);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/health-records?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch health records');
      }
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRecordsLoading(false);
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

      fetchRecords();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete health record');
    }
  };

  const handleTagClick = (tag: string) => {
    setFilterTag(tag);
    setShowFilters(true);
  };

  const clearFilters = () => {
    setKeyword('');
    setFilterSource('');
    setFilterRecordType('');
    setFilterTag('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = keyword || filterSource || filterRecordType || filterTag || startDate || endDate;

  // Get all unique tags from records for filter dropdown
  const allTags = Array.from(new Set(records.flatMap(r => r.tags))).sort();

  if (status === 'loading' || (loading && Object.keys(patients).length === 0)) {
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
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="mb-4">
                  <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
                    Patient
                  </label>
                  <select
                    id="patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                  >
                    <option value="">All Patients</option>
                    {Object.values(patients).map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName || ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      />
                      {recordsLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0175C2]"></div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        showFilters || hasActiveFilters
                          ? 'bg-[#0175C2] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Filters {hasActiveFilters && `(${[keyword, filterSource, filterRecordType, filterTag, startDate, endDate].filter(Boolean).length})`}
                    </button>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <label htmlFor="filterSource" className="block text-sm font-medium text-gray-700 mb-2">
                        Source
                      </label>
                      <select
                        id="filterSource"
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      >
                        <option value="">All Sources</option>
                        {sources.map((source) => (
                          <option key={source.id || source._id} value={source.preferredName}>
                            {source.preferredName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="filterRecordType" className="block text-sm font-medium text-gray-700 mb-2">
                        Record Type
                      </label>
                      <select
                        id="filterRecordType"
                        value={filterRecordType}
                        onChange={(e) => setFilterRecordType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      >
                        <option value="">All Types</option>
                        {categories.map((category) => (
                          <option key={category.code} value={category.code}>
                            {category.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="filterTag" className="block text-sm font-medium text-gray-700 mb-2">
                        Tag
                      </label>
                      <select
                        id="filterTag"
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      >
                        <option value="">All Tags</option>
                        {allTags.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0175C2] focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {keyword && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          Keyword: {keyword}
                          <button
                            onClick={() => setKeyword('')}
                            className="ml-2 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {filterSource && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          Source: {filterSource}
                          <button
                            onClick={() => setFilterSource('')}
                            className="ml-2 hover:text-green-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {filterRecordType && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                          Type: {getRecordTypeLabel(filterRecordType)}
                          <button
                            onClick={() => setFilterRecordType('')}
                            className="ml-2 hover:text-purple-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {filterTag && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          Tag: {filterTag}
                          <button
                            onClick={() => setFilterTag('')}
                            className="ml-2 hover:text-yellow-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {startDate && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          From: {startDate}
                          <button
                            onClick={() => setStartDate('')}
                            className="ml-2 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {endDate && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          To: {endDate}
                          <button
                            onClick={() => setEndDate('')}
                            className="ml-2 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
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
                    {hasActiveFilters ? 'No records match your filters' : 'No health records yet'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {hasActiveFilters 
                      ? 'Try adjusting your search criteria or clear filters to see all records.'
                      : 'Start by adding a health record.'}
                  </p>
                  {selectedPatientId && !hasActiveFilters && (
                    <Link
                      href={`/health-records/new?patientId=${selectedPatientId}`}
                      className="inline-block bg-[#0175C2] hover:bg-[#015a96] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Add Health Record
                    </Link>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Found {records.length} record{records.length !== 1 ? 's' : ''}
                  </div>
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
                            {record.doctorName && (
                              <span className="ml-2">• {record.doctorName}</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 mb-2">
                            {formatDate(record.createdAt)}
                            {patients[record.patientId] && (
                              <span className="ml-2">
                                • {patients[record.patientId].firstName} {patients[record.patientId].lastName || ''}
                              </span>
                            )}
                          </p>
                          {record.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {record.tags.map((tag, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleTagClick(tag)}
                                  className="text-xs bg-gray-100 hover:bg-[#0175C2] hover:text-white text-gray-700 px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  {tag}
                                </button>
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
