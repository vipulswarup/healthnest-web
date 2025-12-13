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
  documentPath?: string;
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
  documentPath?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

export interface UpdateHealthRecordInput {
  recordType?: string;
  data?: Record<string, any>;
  tags?: string[];
  source?: string;
  documentPath?: string;
  hospitalSystemName?: string;
  hospitalIdentifierType?: string;
  hospitalIdentifierValue?: string;
}

