'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
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
              <Image
                src="/android-chrome-512x512.png"
                alt="HealthNest Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <h1 className="text-xl font-bold text-gray-900">HealthNest</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user?.email || session.user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-sm text-[#0175C2] hover:text-[#015a96] font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome{session.user?.firstName ? `, ${session.user.firstName}` : ''}!
              </h2>
              <p className="text-gray-600">
                Your health record management dashboard is coming soon.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/health-records" className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-blue-100">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Health Records</h3>
                <p className="text-sm text-gray-600">Manage your health records and documents</p>
              </Link>
              <Link href="/patients" className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-green-100">
                <div className="text-4xl mb-3">👥</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Patients</h3>
                <p className="text-sm text-gray-600">Manage family members' health profiles</p>
              </Link>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-purple-100">
                <div className="text-4xl mb-3">💊</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Medications</h3>
                <p className="text-sm text-gray-600">Track medications and reminders</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

