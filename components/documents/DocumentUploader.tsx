'use client';

import { useId, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MultiPageScanner } from '@/components/documents/MultiPageScanner';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.heic,.heif,.avif,.gif,.bmp';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface DocumentUploaderProps {
  onUploadSuccess?: (document: { id: string; fileName: string }) => void;
  /** When set, selected files are handed to the parent (multi-file queue). */
  onFilesSelected?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export function DocumentUploader({
  onUploadSuccess,
  onFilesSelected,
  multiple = false,
  disabled = false,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const router = useRouter();

  const validateFiles = (files: File[]) => {
    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tif',
      'image/tiff',
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      'image/avif',
      'image/gif',
      'image/bmp',
      'image/x-ms-bmp',
    ]);
    for (const file of files) {
      if (!allowed.has(file.type.toLowerCase()) && !/\.(pdf|jpe?g|png|webp|tiff?|heic|heif|avif|gif|bmp)$/i.test(file.name)) {
        throw new Error(`Unsupported file type: ${file.name}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${file.name} exceeds the 50MB limit`);
      }
    }
  };

  const takeFiles = (list: FileList | File[] | null) => {
    if (!list || ('length' in list && list.length === 0)) return;
    const files = Array.isArray(list) ? list : Array.from(list);
    setError(null);
    try {
      validateFiles(files);
      if (onFilesSelected) {
        onFilesSelected(multiple ? files : [files[0]]);
        return;
      }
      void uploadSequentially(multiple ? files : [files[0]]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid file');
    }
  };

  const uploadOne = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }
    return data as { id: string; fileName: string };
  };

  const uploadSequentially = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const document = await uploadOne(file);
        if (onUploadSuccess) {
          onUploadSuccess(document);
        } else {
          router.push(`/health-records/new`);
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const blocked = disabled || isUploading;

  if (scanning) {
    return (
      <MultiPageScanner
        onCancel={() => setScanning(false)}
        onComplete={(files) => {
          setScanning(false);
          takeFiles(files);
        }}
      />
    );
  }

  return (
    <div className="w-full">
      <label htmlFor={fileInputId} className="sr-only">
        Choose health record files
      </label>
      <input
        id={fileInputId}
        name="healthRecordDocuments"
        type="file"
        ref={fileInputRef}
        className="sr-only"
        accept={ACCEPTED}
        multiple={multiple}
        onChange={(e) => takeFiles(e.target.files)}
        disabled={blocked}
      />

      {isUploading ? (
        <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-10">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-coral" />
          <p className="text-gray-600">Uploading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={blocked}
              onClick={() => setScanning(true)}
              className="min-h-16 rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-semibold text-gray-950 hover:border-coral hover:bg-blue-50 disabled:opacity-50"
            >
              Scan pages
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-16 rounded-xl bg-coral px-4 py-4 text-base font-semibold text-white hover:bg-coral-strong disabled:opacity-50"
            >
              {multiple ? 'Choose files' : 'Choose from phone'}
            </button>
          </div>
          <p className="text-center text-sm text-gray-600">
            Scan a paper report, or pick a file saved from WhatsApp.
          </p>

          <div
            className={`hidden rounded-lg border-2 border-dashed p-8 text-center transition-colors sm:block ${
              isDragging
                ? 'border-coral bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            } ${blocked ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              takeFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm text-gray-600">
              {multiple
                ? 'On a computer, you can also drop files here'
                : 'On a computer, you can also drop a file here'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF or photo, up to 50MB each
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
