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
  
  // Full-text search index for searching across multiple fields
  // MongoDB text index supports searching across multiple fields
  await healthRecordsCollection.createIndex(
    { 
      source: 'text',
      doctorName: 'text',
      recordType: 'text',
      tags: 'text',
      ocrText: 'text'
    },
    { 
      name: 'health_records_text_index',
      weights: {
        source: 10,
        doctorName: 8,
        recordType: 5,
        tags: 3,
        ocrText: 1
      }
    }
  );

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

  // Health record categories collection indexes
  const healthRecordCategoriesCollection = db.collection('health_record_categories');
  await healthRecordCategoriesCollection.createIndex({ code: 1 }, { unique: true });
  await healthRecordCategoriesCollection.createIndex({ displayName: 1 });
  await healthRecordCategoriesCollection.createIndex({ isActive: 1 });

  // Healthcare sources collection indexes
  const healthcareSourcesCollection = db.collection('healthcare_sources');
  await healthcareSourcesCollection.createIndex({ preferredName: 1 }, { unique: true });
  await healthcareSourcesCollection.createIndex({ aliases: 1 });
  await healthcareSourcesCollection.createIndex({ isActive: 1 });

  // Doctors collection indexes
  const doctorsCollection = db.collection('doctors');
  await doctorsCollection.createIndex({ preferredName: 1 }, { unique: true });
  await doctorsCollection.createIndex({ aliases: 1 });
  await doctorsCollection.createIndex({ isActive: 1 });
  await doctorsCollection.createIndex({ createdAt: -1 });

  console.log('MongoDB indexes initialized successfully');
}

