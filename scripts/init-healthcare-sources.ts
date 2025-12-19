import dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../lib/mongodb';

const HEALTHCARE_SOURCES = [
  { preferredName: "Dr Lal PathLabs", aliases: ["Lal PathLabs", "Dr. Lal", "Dr Lal Laboratory", "Lal Diagnostics"], isActive: true },
  { preferredName: "SRL Diagnostics", aliases: ["SRL Labs", "SRL Ranbaxy", "SRL Limited"], isActive: true },
  { preferredName: "Thyrocare", aliases: ["Thyrocare Technologies", "Thyrocare Labs"], isActive: true },
  { preferredName: "Metropolis Healthcare", aliases: ["Metropolis Labs", "Metropolis Diagnostics"], isActive: true },
  { preferredName: "Apollo Diagnostics", aliases: ["Apollo Lab", "Apollo Pathology"], isActive: true },
  { preferredName: "Tata 1mg Labs", aliases: ["1mg Labs", "Tata 1mg", "1mg Diagnostics"], isActive: true },
  { preferredName: "MedGenome Labs", aliases: ["MedGenome", "MedGenome Diagnostics"], isActive: true },
  { preferredName: "Strand Life Sciences", aliases: ["Strand Genomics", "Strand Labs"], isActive: true },
  { preferredName: "Neuberg Diagnostics", aliases: ["Neuberg Lab", "Neuberg Anand"], isActive: true },
  { preferredName: "Aarthi Scans & Labs", aliases: ["Aarthi Scans", "Aarthi Diagnostics"], isActive: true },
  { preferredName: "Oncquest Laboratories", aliases: ["Oncquest", "Oncquest Labs"], isActive: true },
  { preferredName: "Pathkind Labs", aliases: ["Pathkind Diagnostics"], isActive: true },
  { preferredName: "Redcliffe Labs", aliases: ["Redcliffe Diagnostics"], isActive: true },
  { preferredName: "Core Diagnostics", aliases: ["Core Lab"], isActive: true },
  { preferredName: "Lupin Diagnostics", aliases: ["Lupin Labs"], isActive: true },
  { preferredName: "Vijaya Diagnostic Centre", aliases: ["Vijaya Diagnostics", "Vijaya Labs"], isActive: true },
  { preferredName: "Suburban Diagnostics", aliases: ["Suburban Lab"], isActive: true },
  { preferredName: "DDRC Diagnostics", aliases: ["DDRC Labs"], isActive: true },
  { preferredName: "Anand Diagnostic Laboratory", aliases: ["Anand Diagnostics"], isActive: true },
  { preferredName: "Mahajan Imaging", aliases: ["Mahajan Imaging Centre"], isActive: true },
  { preferredName: "Primus Imaging", aliases: ["Primus Diagnostics"], isActive: true },
  { preferredName: "Clumax Diagnostics", aliases: ["Clumax Imaging"], isActive: true },
  { preferredName: "NM Medical", aliases: ["NM Diagnostics"], isActive: true },
  { preferredName: "Medall Diagnostics", aliases: ["Medall Healthcare"], isActive: true },
  { preferredName: "Agilus Diagnostics", aliases: ["Agilus", "SRL", "Lifeline Laboratory"], isActive: true },
  { preferredName: "City X-Ray & Scan Clinic", aliases: ["City Xray", "City Scan"], isActive: true },
  { preferredName: "Apollo Radiology International", aliases: ["Apollo Radiology"], isActive: true },
  { preferredName: "Apollo Hospitals", aliases: ["Apollo Hospital", "Apollo Group"], isActive: true },
  { preferredName: "Fortis Healthcare", aliases: ["Fortis Hospital", "Fortis Memorial Research Institute", "Fortis Escorts", "Escorts Hospital"], isActive: true },
  { preferredName: "Max Healthcare", aliases: ["Max Hospital"], isActive: true },
  { preferredName: "Manipal Hospitals", aliases: ["Manipal Hospital"], isActive: true },
  { preferredName: "Medanta – The Medicity", aliases: ["Medanta Hospital", "The Medicity"], isActive: true },
  { preferredName: "Narayana Health", aliases: ["Narayana Hrudayalaya", "NH Hospitals"], isActive: true },
  { preferredName: "Aster DM Healthcare", aliases: ["Aster Hospital"], isActive: true },
  { preferredName: "Kokilaben Dhirubhai Ambani Hospital", aliases: ["KDAH", "Kokilaben Hospital"], isActive: true },
  { preferredName: "Artemis Hospital", aliases: ["Artemis Health"], isActive: true },
  { preferredName: "BLK-Max Super Speciality Hospital", aliases: ["BLK Hospital", "BLK Max"], isActive: true },
  { preferredName: "Sir Ganga Ram Hospital", aliases: ["Ganga Ram Hospital"], isActive: true },
  { preferredName: "AIIMS New Delhi", aliases: ["All India Institute of Medical Sciences", "AIIMS"], isActive: true },
  { preferredName: "Tata Memorial Hospital", aliases: ["TMH Mumbai"], isActive: true },
  { preferredName: "Christian Medical College Vellore", aliases: ["CMC Vellore"], isActive: true },
  { preferredName: "PGIMER Chandigarh", aliases: ["PGI Chandigarh"], isActive: true },
  { preferredName: "Jaslok Hospital", aliases: ["Jaslok Hospital & Research Centre"], isActive: true },
  { preferredName: "Breach Candy Hospital", aliases: ["Breach Candy"], isActive: true },
  { preferredName: "Lilavati Hospital", aliases: ["Lilavati Hospital Mumbai"], isActive: true },
  { preferredName: "Saifee Hospital", aliases: ["Saifee Medical Centre"], isActive: true },
  { preferredName: "Hinduja Hospital", aliases: ["PD Hinduja", "Hinduja Hospital Mahim"], isActive: true },
  { preferredName: "Ruby Hall Clinic", aliases: ["Ruby Hall"], isActive: true },
  { preferredName: "NIMHANS Bengaluru", aliases: ["NIMHANS"], isActive: true },
  { preferredName: "Amrita Institute of Medical Sciences", aliases: ["Amrita Hospital Kochi"], isActive: true },
  { preferredName: "Yashoda Hospitals", aliases: ["Yashoda Hospital"], isActive: true },
  { preferredName: "CARE Hospitals", aliases: ["Care Hospital"], isActive: true },
  { preferredName: "Cloudnine Hospitals", aliases: ["Cloudnine"], isActive: true },
  { preferredName: "Rainbow Children's Hospital", aliases: ["Rainbow Hospital"], isActive: true },
  { preferredName: "Medicover Hospitals", aliases: ["Medicover"], isActive: true },
  { preferredName: "Wockhardt Hospitals", aliases: ["Wockhardt"], isActive: true },
];

async function main() {
  try {
    console.log('Initializing healthcare sources...');
    const db = await getDatabase();
    const sourcesCollection = db.collection('healthcare_sources');

    // Create unique index on preferredName
    await sourcesCollection.createIndex({ preferredName: 1 }, { unique: true });
    // Create index on aliases for faster searching
    await sourcesCollection.createIndex({ aliases: 1 });
    // Create index on isActive for filtering
    await sourcesCollection.createIndex({ isActive: 1 });
    console.log('Created indexes on healthcare_sources collection');

    // Check existing sources
    const existingCount = await sourcesCollection.countDocuments();
    console.log(`Found ${existingCount} existing sources in database.`);

    // Upsert sources (insert new ones, update existing ones)
    const now = new Date();
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const source of HEALTHCARE_SOURCES) {
      try {
        const result = await sourcesCollection.updateOne(
          { preferredName: source.preferredName },
          {
            $setOnInsert: {
              preferredName: source.preferredName,
              createdAt: now,
            },
            $set: {
              aliases: source.aliases,
              isActive: source.isActive,
              updatedAt: now,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          insertedCount++;
        } else if (result.modifiedCount > 0) {
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error upserting source "${source.preferredName}":`, error);
      }
    }

    console.log(`\nInitialization complete:`);
    console.log(`  - Inserted: ${insertedCount} new sources`);
    console.log(`  - Updated: ${updatedCount} existing sources`);
    console.log(`  - Skipped: ${skippedCount} unchanged sources`);
    console.log(`  - Total in database: ${await sourcesCollection.countDocuments()} sources`);
  } catch (error) {
    console.error('Error initializing healthcare sources:', error);
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

