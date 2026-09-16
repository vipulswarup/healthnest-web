'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/health-records/new');
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <p className="text-gray-600" role="status">Opening add report…</p>
    </div>
  );
}
