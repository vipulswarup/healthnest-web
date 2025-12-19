export interface HealthRecordCategory {
  _id?: string;
  id?: string;
  code: string;
  displayName: string;
  standardSystem: string | null;
  standardCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

