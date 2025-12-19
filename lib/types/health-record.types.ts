export interface HealthRecord {
  _id?: string;
  id?: string;
  patientId: string;
  createdAt: Date;
  updatedAt: Date;
  recordType: string;
  data: Record<string, any>;
  tags: string[];
  source: string;
  doctorName?: string;
  documentDate?: Date | string;
  documentPath?: string;
  ocrText?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

export interface CreateHealthRecordInput {
  patientId: string;
  recordType: string;
  data: Record<string, any>;
  tags?: string[];
  source: string;
  doctorName?: string;
  documentDate?: string;
  documentPath?: string;
  ocrText?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

export interface UpdateHealthRecordInput {
  recordType?: string;
  data?: Record<string, any>;
  tags?: string[];
  source?: string;
  doctorName?: string;
  documentDate?: string;
  documentPath?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

