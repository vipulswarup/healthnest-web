'use client';

export default function DebugPage() {
  const envVars = {
    hasNextAuthSecret: !!process.env.NEXT_PUBLIC_NEXTAUTH_SECRET_CHECK,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Environment Variables (Public)</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Checklist</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>NEXTAUTH_SECRET should be set (not shown here for security)</li>
              <li>NEXTAUTH_URL should match your production URL</li>
              <li>MONGODB_URI should be set</li>
              <li>Check Vercel build logs for errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

