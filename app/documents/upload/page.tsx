'use client';

import { DocumentUploader } from '@/components/documents/DocumentUploader';

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900">Upload Medical Record</h1>
                    <p className="mt-2 text-gray-600">
                        Upload your prescriptions, lab reports, or discharge summaries.
                        We will scan and organize them for you.
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <DocumentUploader />
                </div>
            </div>
        </div>
    );
}
