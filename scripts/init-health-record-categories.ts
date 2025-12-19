import dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../lib/mongodb';

const HEALTH_RECORD_CATEGORIES = [
  { code: 'PATHOLOGY_TEST', displayName: 'Pathology Test', standardSystem: 'LOINC', standardCode: 'Laboratory Test Result', isActive: true },
  { code: 'MICROBIOLOGY_REPORT', displayName: 'Microbiology Report', standardSystem: 'LOINC', standardCode: 'Microbiology', isActive: true },
  { code: 'BIOCHEMISTRY_REPORT', displayName: 'Biochemistry Report', standardSystem: 'LOINC', standardCode: 'Chemistry panel', isActive: true },
  { code: 'HEMATOLOGY_REPORT', displayName: 'Hematology Report', standardSystem: 'LOINC', standardCode: 'Hematology panel', isActive: true },
  { code: 'IMMUNOLOGY_TEST', displayName: 'Immunology Test', standardSystem: 'LOINC', standardCode: 'Immunology', isActive: true },
  { code: 'TUMOR_MARKER_TEST', displayName: 'Tumor Marker Test', standardSystem: 'LOINC', standardCode: 'Tumor markers', isActive: true },
  { code: 'HORMONE_ASSAY', displayName: 'Hormone Assay', standardSystem: 'LOINC', standardCode: 'Endocrine tests', isActive: true },
  { code: 'SEROLOGY_TEST', displayName: 'Serology Test', standardSystem: 'LOINC', standardCode: 'Serology', isActive: true },
  { code: 'TOXICOLOGY_REPORT', displayName: 'Toxicology Report', standardSystem: 'LOINC', standardCode: 'Toxicology', isActive: true },
  { code: 'HISTOPATHOLOGY_REPORT', displayName: 'Histopathology Report', standardSystem: 'SNOMED_CT', standardCode: 'Histopathology report', isActive: true },
  { code: 'CYTOLOGY_REPORT', displayName: 'Cytology Report', standardSystem: 'SNOMED_CT', standardCode: 'Cytopathology report', isActive: true },
  { code: 'BLOOD_BANK_TRANSFUSION', displayName: 'Blood Bank / Transfusion Record', standardSystem: 'SNOMED_CT', standardCode: 'Blood transfusion procedure', isActive: true },
  { code: 'RADIOLOGY_SCAN', displayName: 'Radiology Scan', standardSystem: 'DICOM', standardCode: null, isActive: true },
  { code: 'IMAGING_REPORT', displayName: 'Imaging Report', standardSystem: 'FHIR', standardCode: 'DiagnosticReport', isActive: true },
  { code: 'ULTRASOUND_REPORT', displayName: 'Ultrasound Report', standardSystem: 'SNOMED_CT', standardCode: 'Ultrasonography', isActive: true },
  { code: 'CT_SCAN', displayName: 'CT Scan', standardSystem: 'SNOMED_CT', standardCode: 'Computed tomography', isActive: true },
  { code: 'MRI_SCAN', displayName: 'MRI Scan', standardSystem: 'SNOMED_CT', standardCode: 'Magnetic resonance imaging', isActive: true },
  { code: 'PET_SCAN', displayName: 'PET Scan', standardSystem: 'SNOMED_CT', standardCode: 'Positron emission tomography', isActive: true },
  { code: 'NUCLEAR_MEDICINE_SCAN', displayName: 'Nuclear Medicine Scan', standardSystem: 'SNOMED_CT', standardCode: 'Nuclear medicine imaging', isActive: true },
  { code: 'INTERVENTIONAL_RADIOLOGY_REPORT', displayName: 'Interventional Radiology Report', standardSystem: 'SNOMED_CT', standardCode: 'Interventional radiology procedure', isActive: true },
  { code: 'CLINICAL_SYNOPSIS', displayName: 'Clinical Synopsis', standardSystem: 'FHIR', standardCode: 'ClinicalImpression', isActive: true },
  { code: 'DOCTOR_CONSULTATION_NOTE', displayName: 'Doctor Consultation Note', standardSystem: 'SNOMED_CT', standardCode: 'Clinical note', isActive: true },
  { code: 'PROGRESS_NOTE', displayName: 'Progress Note', standardSystem: 'SNOMED_CT', standardCode: 'Progress report', isActive: true },
  { code: 'ADMISSION_NOTE', displayName: 'Admission Note', standardSystem: 'HL7_CDA', standardCode: 'Admission note', isActive: true },
  { code: 'DISCHARGE_SUMMARY', displayName: 'Discharge Summary', standardSystem: 'FHIR', standardCode: 'Composition / Discharge summary', isActive: true },
  { code: 'REFERRAL_LETTER', displayName: 'Referral Letter', standardSystem: 'HL7_CDA', standardCode: 'Referral document', isActive: true },
  { code: 'SECOND_OPINION', displayName: 'Second Opinion', standardSystem: 'SNOMED_CT', standardCode: 'Second opinion', isActive: true },
  { code: 'MULTIDISCIPLINARY_TUMOR_BOARD_NOTE', displayName: 'Multidisciplinary Tumor Board Note', standardSystem: 'SNOMED_CT', standardCode: 'Multidisciplinary care review', isActive: true },
  { code: 'NURSING_NOTE', displayName: 'Nursing Note', standardSystem: 'SNOMED_CT', standardCode: 'Nursing documentation', isActive: true },
  { code: 'ALLIED_HEALTH_NOTE', displayName: 'Allied Health Note', standardSystem: 'SNOMED_CT', standardCode: 'Allied health note', isActive: true },
  { code: 'DIAGNOSIS', displayName: 'Diagnosis', standardSystem: 'SNOMED_CT', standardCode: 'Clinical finding', isActive: true },
  { code: 'PROVISIONAL_DIAGNOSIS', displayName: 'Provisional Diagnosis', standardSystem: 'SNOMED_CT', standardCode: 'Suspected condition', isActive: true },
  { code: 'DIFFERENTIAL_DIAGNOSIS', displayName: 'Differential Diagnosis', standardSystem: 'SNOMED_CT', standardCode: 'Differential diagnosis', isActive: true },
  { code: 'PROBLEM_LIST', displayName: 'Problem List', standardSystem: 'FHIR', standardCode: 'Condition', isActive: true },
  { code: 'CHRONIC_CONDITION_RECORD', displayName: 'Chronic Condition Record', standardSystem: 'SNOMED_CT', standardCode: 'Chronic disease', isActive: true },
  { code: 'CANCER_STAGING', displayName: 'Cancer Staging', standardSystem: 'TNM', standardCode: null, isActive: true },
  { code: 'DISEASE_SEVERITY_ASSESSMENT', displayName: 'Disease Severity Assessment', standardSystem: 'SNOMED_CT', standardCode: 'Severity modifier', isActive: true },
  { code: 'MEDICATION', displayName: 'Medication', standardSystem: 'RxNorm', standardCode: null, isActive: true },
  { code: 'MEDICATION_ORDER', displayName: 'Medication Order', standardSystem: 'FHIR', standardCode: 'MedicationRequest', isActive: true },
  { code: 'PRESCRIPTION', displayName: 'Prescription', standardSystem: 'SNOMED_CT', standardCode: 'Prescription record', isActive: true },
  { code: 'MEDICATION_ADMINISTRATION', displayName: 'Medication Administration', standardSystem: 'FHIR', standardCode: 'MedicationAdministration', isActive: true },
  { code: 'CHEMOTHERAPY_PROTOCOL', displayName: 'Chemotherapy Protocol', standardSystem: 'SNOMED_CT', standardCode: 'Chemotherapy regimen', isActive: true },
  { code: 'IMMUNOTHERAPY_PROTOCOL', displayName: 'Immunotherapy Protocol', standardSystem: 'SNOMED_CT', standardCode: 'Immunotherapy', isActive: true },
  { code: 'MEDICATION_HISTORY', displayName: 'Medication History', standardSystem: 'SNOMED_CT', standardCode: 'Medication history', isActive: true },
  { code: 'ADVERSE_DRUG_REACTION', displayName: 'Adverse Drug Reaction', standardSystem: 'SNOMED_CT', standardCode: 'Adverse reaction', isActive: true },
  { code: 'ALLERGY_RECORD', displayName: 'Allergy Record', standardSystem: 'FHIR', standardCode: 'AllergyIntolerance', isActive: true },
  { code: 'TREATMENT_PLAN', displayName: 'Treatment Plan', standardSystem: 'FHIR', standardCode: 'CarePlan', isActive: true },
  { code: 'VITAL_SIGNS', displayName: 'Vital Signs', standardSystem: 'FHIR', standardCode: 'Observation', isActive: true },
  { code: 'BLOOD_PRESSURE_LOG', displayName: 'Blood Pressure Log', standardSystem: 'LOINC', standardCode: 'Blood pressure panel', isActive: true },
  { code: 'BLOOD_GLUCOSE_LOG', displayName: 'Blood Glucose Log', standardSystem: 'LOINC', standardCode: 'Glucose', isActive: true },
  { code: 'OXYGEN_SATURATION_RECORD', displayName: 'Oxygen Saturation Record', standardSystem: 'LOINC', standardCode: 'SpO₂', isActive: true },
  { code: 'WEIGHT_BMI_RECORD', displayName: 'Weight / BMI Record', standardSystem: 'LOINC', standardCode: 'Body measurements', isActive: true },
  { code: 'PAIN_SCORE', displayName: 'Pain Score', standardSystem: 'SNOMED_CT', standardCode: 'Pain severity', isActive: true },
  { code: 'HOME_MONITORING_DATA', displayName: 'Home Monitoring Data', standardSystem: 'FHIR', standardCode: 'Observation', isActive: true },
  { code: 'WEARABLE_DEVICE_DATA', displayName: 'Wearable Device Data', standardSystem: 'FHIR', standardCode: 'Device / Observation', isActive: true },
  { code: 'SURGICAL_PROCEDURE', displayName: 'Surgical Procedure', standardSystem: 'SNOMED_CT', standardCode: 'Procedure', isActive: true },
  { code: 'MINOR_PROCEDURE', displayName: 'Minor Procedure', standardSystem: 'SNOMED_CT', standardCode: 'Procedure', isActive: true },
  { code: 'ENDOSCOPY_COLONOSCOPY_REPORT', displayName: 'Endoscopy / Colonoscopy Report', standardSystem: 'SNOMED_CT', standardCode: 'Endoscopic procedure', isActive: true },
  { code: 'BIOPSY_REPORT', displayName: 'Biopsy Report', standardSystem: 'SNOMED_CT', standardCode: 'Biopsy', isActive: true },
  { code: 'DIALYSIS_RECORD', displayName: 'Dialysis Record', standardSystem: 'SNOMED_CT', standardCode: 'Dialysis', isActive: true },
  { code: 'RADIATION_THERAPY_RECORD', displayName: 'Radiation Therapy Record', standardSystem: 'SNOMED_CT', standardCode: 'Radiotherapy', isActive: true },
  { code: 'IMPLANT_DEVICE_RECORD', displayName: 'Implant / Device Record', standardSystem: 'FHIR', standardCode: 'Device', isActive: true },
  { code: 'GENOMIC_TEST', displayName: 'Genomic Test', standardSystem: 'HL7_FHIR_Genomics', standardCode: null, isActive: true },
  { code: 'DNA_TEST', displayName: 'DNA Test', standardSystem: 'LOINC', standardCode: 'Genetic tests', isActive: true },
  { code: 'SOMATIC_MUTATION_REPORT', displayName: 'Somatic Mutation Report', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'GERMLINE_MUTATION_REPORT', displayName: 'Germline Mutation Report', standardSystem: 'LOINC', standardCode: null, isActive: true },
  { code: 'PHARMACOGENOMIC_REPORT', displayName: 'Pharmacogenomic Report', standardSystem: 'HL7_Genomics', standardCode: null, isActive: true },
  { code: 'MOLECULAR_PATHOLOGY_REPORT', displayName: 'Molecular Pathology Report', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'COMPANION_DIAGNOSTIC_TEST', displayName: 'Companion Diagnostic Test', standardSystem: 'LOINC', standardCode: null, isActive: true },
  { code: 'VACCINATION_RECORD', displayName: 'Vaccination Record', standardSystem: 'FHIR', standardCode: 'Immunization', isActive: true },
  { code: 'PREVENTIVE_SCREENING', displayName: 'Preventive Screening', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'HEALTH_CHECKUP_SUMMARY', displayName: 'Health Checkup Summary', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'LIFESTYLE_ASSESSMENT', displayName: 'Lifestyle Assessment', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'RISK_ASSESSMENT', displayName: 'Risk Assessment', standardSystem: 'FHIR', standardCode: 'RiskAssessment', isActive: true },
  { code: 'FAMILY_HISTORY', displayName: 'Family History', standardSystem: 'FHIR', standardCode: 'FamilyMemberHistory', isActive: true },
  { code: 'CONSENT_FORM', displayName: 'Consent Form', standardSystem: 'HL7_CDA', standardCode: 'Consent', isActive: true },
  { code: 'INSURANCE_TPA_APPROVAL', displayName: 'Insurance / TPA Approval', standardSystem: null, standardCode: null, isActive: true },
  { code: 'MEDICAL_CERTIFICATE', displayName: 'Medical Certificate', standardSystem: 'SNOMED_CT', standardCode: 'Medical certificate', isActive: true },
  { code: 'DISABILITY_CERTIFICATE', displayName: 'Disability Certificate', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'FITNESS_CERTIFICATE', displayName: 'Fitness Certificate', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
  { code: 'ADVANCE_DIRECTIVE', displayName: 'Advance Directive', standardSystem: 'FHIR', standardCode: 'AdvanceDirective', isActive: true },
  { code: 'ORGAN_DONOR_STATUS', displayName: 'Organ Donor Status', standardSystem: 'SNOMED_CT', standardCode: null, isActive: true },
];

async function main() {
  try {
    console.log('Initializing health record categories...');
    const db = await getDatabase();
    const categoriesCollection = db.collection('health_record_categories');

    // Create unique index on code
    await categoriesCollection.createIndex({ code: 1 }, { unique: true });
    console.log('Created unique index on code field');

    // Check if categories already exist
    const existingCount = await categoriesCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing categories. Skipping insertion.`);
      console.log('To reinitialize, drop the collection first.');
      return;
    }

    // Insert categories with timestamps
    const now = new Date();
    const categoriesToInsert = HEALTH_RECORD_CATEGORIES.map(category => ({
      ...category,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await categoriesCollection.insertMany(categoriesToInsert);
    console.log(`Successfully inserted ${result.insertedCount} health record categories`);
    console.log('Health record categories initialization complete!');
  } catch (error) {
    console.error('Error initializing health record categories:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

