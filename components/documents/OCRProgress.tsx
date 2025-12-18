'use client';

interface OCRProgressProps {
    label: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    error?: string;
}

export function OCRProgress({ label, status, error }: OCRProgressProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm mb-3">
            <div className="flex items-center">
                <div className={`p-2 rounded-full mr-3 ${status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                        status === 'FAILED' ? 'bg-red-100 text-red-600' :
                            status === 'PROCESSING' ? 'bg-blue-100 text-blue-600' :
                                'bg-gray-100 text-gray-400'
                    }`}>
                    {status === 'COMPLETED' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {status === 'FAILED' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    {status === 'PROCESSING' && (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    {status === 'PENDING' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">
                        {status === 'PENDING' && 'Waiting to start...'}
                        {status === 'PROCESSING' && 'In progress...'}
                        {status === 'COMPLETED' && 'Completed'}
                        {status === 'FAILED' && 'Failed'}
                    </p>
                </div>
            </div>
            {status === 'FAILED' && error && (
                <div className="text-sm text-red-600 max-w-xs text-right">
                    {error}
                </div>
            )}
        </div>
    );
}
