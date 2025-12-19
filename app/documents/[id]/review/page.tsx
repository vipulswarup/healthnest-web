'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentMetadata } from '@/lib/types/document.types';
import { OCRProgress } from '@/components/documents/OCRProgress';
import { AISuggestions } from '@/components/documents/AISuggestions';

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [document, setDocument] = useState<DocumentMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Processing states
    const [ocrStatus, setOcrStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('PENDING');
    const [aiStatus, setAiStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('PENDING');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch document details
    const fetchDocument = useCallback(async () => {
        try {
            const res = await fetch(`/api/documents/${id}`);
            if (!res.ok) throw new Error('Failed to load document');
            const data = await res.json();
            setDocument(data);
            if (data.ocrStatus) setOcrStatus(data.ocrStatus);
            if (data.aiStatus) setAiStatus(data.aiStatus);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDocument();
    }, [fetchDocument]);

    // Trigger OCR if not done
    useEffect(() => {
        if (document && !document.ocrText && ocrStatus === 'PENDING') {
            runOCR();
        }
    }, [document, ocrStatus]);

    // Trigger AI if OCR done but AI not
    useEffect(() => {
        if (document && document.ocrText && !document.classification && aiStatus === 'PENDING') {
            runAIAnalysis();
        } else if (document && document.ocrText && document.ocrStatus === 'COMPLETED' && aiStatus === 'PENDING') {
            // If we just finished OCR but AI hasn't run (and no classification exists)
            runAIAnalysis();
        }
    }, [document, aiStatus, ocrStatus]);

    const runOCR = async () => {
        setOcrStatus('PROCESSING');
        try {
            const res = await fetch('/api/ocr/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: id }),
            });
            if (!res.ok) throw new Error('OCR Failed');

            await fetchDocument(); // Refresh to get text
            setOcrStatus('COMPLETED');
        } catch (err) {
            console.error(err);
            setOcrStatus('FAILED');
        }
    };

    const runAIAnalysis = async () => {
        setAiStatus('PROCESSING');
        try {
            // 1. Classification
            const classifyRes = await fetch('/api/ai/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: id }),
            });
            if (!classifyRes.ok) throw new Error('Classification Failed');

            // 2. Tagging
            const tagRes = await fetch('/api/ai/suggest-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: id }),
            });
            if (!tagRes.ok) console.warn('Tagging Failed'); // Non-critical

            await fetchDocument();
            setAiStatus('COMPLETED');
        } catch (err) {
            console.error(err);
            setAiStatus('FAILED');
        }
    };

    const handleApprove = async (classification: string, tags: string[]) => {
        setIsSaving(true);
        // Here we would effectively "Update" the document with final verified data
        // For now, let's just create a mock "Success" interaction
        // In a real app, we might move this to the "HealthRecord" table now.

        // Simulate API call to save approval
        await new Promise(resolve => setTimeout(resolve, 1000));

        alert(`Document approved as ${classification} with ${tags.length} tags!`);
        router.push('/dashboard'); // Or back to list
        setIsSaving(false);
    };

    const isProcessing = ocrStatus === 'PROCESSING' || aiStatus === 'PROCESSING';

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (error) return <div className="p-10 text-center text-red-600">Error: {error}</div>;
    if (!document) return null;

    return (
        <div className={`min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}>
                <div className="max-w-5xl mx-auto">
                    <div className="md:flex md:gap-6">

                        {/* Left: Document Preview */}
                        <div className="md:w-1/2 mb-6 md:mb-0">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Document Preview</h2>
                            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 aspect-[3/4] relative">
                                {/* Use iframe for PDF, img for others. Simplifying to img for this demo if it's image */}
                                {document.fileType === 'application/pdf' ? (
                                    <iframe src={document.fileUrl} className="w-full h-full" />
                                ) : (
                                    <img
                                        src={document.fileUrl}
                                        alt="Document"
                                        className="w-full h-full object-contain bg-gray-900"
                                    />
                                )}
                            </div>
                            <div className="mt-4">
                                <h3 className="font-semibold text-gray-700">OCR Text Content</h3>
                                <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600 h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                                    {document.ocrText || 'No text extracted yet...'}
                                </div>
                            </div>
                        </div>

                        {/* Right: Processing & Review */}
                        <div className="md:w-1/2">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Processing Status</h2>

                            <OCRProgress label="Text Extraction (OCR)" status={ocrStatus} />
                            <OCRProgress label="AI Analysis" status={aiStatus} />

                            {(ocrStatus === 'COMPLETED' || document.ocrText) && (
                                <AISuggestions
                                    documentId={id}
                                    initialClassification={document.classification}
                                    initialTags={document.suggestedTags || []}
                                    autoSelectedTags={document.approvedTags || []}
                                    onSave={handleApprove}
                                    isSaving={isSaving}
                                    disabled={isProcessing}
                                />
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
