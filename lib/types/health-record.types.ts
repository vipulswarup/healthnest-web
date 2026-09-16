export interface HealthRecord {
  _id?: string;
  id?: string;
  patientId: string;
  createdAt: Date;
  updatedAt: Date;
  recordType: string;
  data: Record<string, unknown>;
  tags: string[];
  source: string;
  doctorName?: string;
  documentDate?: Date | string;
  documentId?: string;
  ocrText?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

export interface CreateHealthRecordInput {
  patientId: string;
  recordType: string;
  data: Record<string, unknown>;
  tags?: string[];
  source: string;
  doctorName?: string;
  documentDate?: string;
  documentId?: string;
  ocrText?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

export interface UpdateHealthRecordInput {
  recordType?: string;
  data?: Record<string, unknown>;
  tags?: string[];
  source?: string;
  doctorName?: string;
  documentDate?: string;
  documentId?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}
