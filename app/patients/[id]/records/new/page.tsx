'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy path — send users to the OCR/AI multi-file intake flow. */
export default function LegacyNewPatientRecordPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  useEffect(() => {
    router.replace(`/health-records/new?patientId=${encodeURIComponent(patientId)}`);
  }, [patientId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto" />
        <p className="mt-4 text-gray-600">Opening document intake...</p>
      </div>
    </div>
  );
}
