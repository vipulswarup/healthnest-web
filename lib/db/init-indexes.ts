import { getDatabase } from '../mongodb';

export async function initializeIndexes() {
  const db = await getDatabase();

  // Users collection indexes
  const usersCollection = db.collection('users');
  await usersCollection.createIndex({ emails: 1 });
  await usersCollection.createIndex({ 'mobileNumbers.number': 1 });
  await usersCollection.createIndex({ createdAt: -1 });

  // Patients collection indexes
  const patientsCollection = db.collection('patients');
  await patientsCollection.createIndex({ userId: 1 });
  await patientsCollection.createIndex({ abhaNumber: 1 }, { sparse: true });
  await patientsCollection.createIndex({ 'hospitalIdentifiers.systemName': 1, 'hospitalIdentifiers.value': 1 });
  await patientsCollection.createIndex({ 'mobileNumbers.number': 1 });
  await patientsCollection.createIndex({ createdAt: -1 });

  // Health records collection indexes
  const healthRecordsCollection = db.collection('health_records');
  await healthRecordsCollection.createIndex({ patientId: 1, createdAt: -1 });
  await healthRecordsCollection.createIndex({ recordType: 1 });
  await healthRecordsCollection.createIndex({ tags: 1 });
  await healthRecordsCollection.createIndex({ hospitalSystemName: 1, hospitalIdentifierValue: 1 }, { sparse: true });
  await healthRecordsCollection.createIndex({ createdAt: -1 });

  // Medications collection indexes
  const medicationsCollection = db.collection('medications');
  await medicationsCollection.createIndex({ patientId: 1, isActive: 1 });
  await medicationsCollection.createIndex({ startDate: -1 });
  await medicationsCollection.createIndex({ createdAt: -1 });

  // Medication doses collection indexes
  const medicationDosesCollection = db.collection('medication_doses');
  await medicationDosesCollection.createIndex({ medicationId: 1, scheduledTime: -1 });
  await medicationDosesCollection.createIndex({ scheduledTime: 1 });

  // Medication reminders collection indexes
  const medicationRemindersCollection = db.collection('medication_reminders');
  await medicationRemindersCollection.createIndex({ medicationId: 1 });
  await medicationRemindersCollection.createIndex({ isEnabled: 1, scheduledTime: 1 });

  console.log('MongoDB indexes initialized successfully');
}

