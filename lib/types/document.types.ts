export interface DocumentMetadata {
  _id?: string;
  id?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  /** A signed URL is deliberately never persisted; fetch one through /api/documents/view. */
  fileUrl?: string;
  r2Key: string;
  uploadedAt: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  
  // OCR Data
  ocrStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  ocrText?: string;
  
  // AI Data
  aiStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  classification?: string; // e.g., "Lab Report", "Prescription"
  extractedData?: Record<string, unknown>;
  suggestedTags?: string[];
  confidenceScore?: number;
  
  // User Review
  isApproved: boolean;
  approvedAt?: Date;
  approvedTags?: string[];
  rejectionReason?: string;
}

export interface CreateDocumentInput {
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  r2Key: string;
}
