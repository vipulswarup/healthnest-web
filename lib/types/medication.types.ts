export interface Medication {
  _id?: string;
  id?: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  prescribedBy?: string;
  source?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface MedicationDose {
  _id?: string;
  id?: string;
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  isTaken: boolean;
  notes?: string;
  createdAt: Date;
}

export interface MedicationReminder {
  _id?: string;
  id?: string;
  medicationId: string;
  title: string;
  message: string;
  scheduledTime: Date;
  isEnabled: boolean;
  frequency: string;
  daysOfWeek: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationInput {
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  prescribedBy?: string;
  source?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateMedicationInput {
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: Date;
  endDate?: Date;
  instructions?: string;
  prescribedBy?: string;
  source?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface CreateMedicationDoseInput {
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  isTaken?: boolean;
  notes?: string;
}

export interface CreateMedicationReminderInput {
  medicationId: string;
  title: string;
  message: string;
  scheduledTime: Date;
  isEnabled?: boolean;
  frequency: string;
  daysOfWeek: number[];
}

