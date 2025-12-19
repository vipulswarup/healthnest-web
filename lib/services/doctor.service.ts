import { getDatabase } from '../mongodb';
import { Doctor } from '../types/doctor.types';
import { ObjectId } from 'mongodb';

function normalizeDoctorName(name: string): string {
  // Remove common prefixes and normalize
  let normalized = name.toLowerCase().trim();
  
  // Remove common doctor prefixes
  normalized = normalized.replace(/^(dr\.?|doctor|doc\.?)\s+/i, '');
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized.trim();
}

function fuzzyMatch(str1: string, str2: string): boolean {
  const normalized1 = normalizeDoctorName(str1);
  const normalized2 = normalizeDoctorName(str2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one contains the other (for partial matches)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Require at least 3 characters for partial match
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength >= 3) return true;
  }
  
  // Check similarity using Levenshtein-like approach (simple version)
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
  
  if (longer.length === 0) return true;
  if (shorter.length === 0) return false;
  
  // If shorter string is at least 70% of longer string and is contained, consider it a match
  const similarity = shorter.length / longer.length;
  if (similarity >= 0.7 && longer.includes(shorter)) return true;
  
  return false;
}

export async function findDoctorByName(name: string): Promise<Doctor | null> {
  if (!name || !name.trim()) return null;
  
  const db = await getDatabase();
  const doctorsCollection = db.collection('doctors');
  
  const normalizedSearch = normalizeDoctorName(name);
  
  // First try exact match on preferredName
  let doctor = await doctorsCollection.findOne({
    preferredName: { $regex: new RegExp(`^${normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isActive: true
  });
  
  if (doctor) {
    return {
      ...doctor,
      id: doctor._id.toString(),
      _id: doctor._id.toString(),
    } as Doctor;
  }
  
  // Try matching against aliases
  doctor = await doctorsCollection.findOne({
    aliases: { $regex: new RegExp(`^${normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isActive: true
  });
  
  if (doctor) {
    return {
      ...doctor,
      id: doctor._id.toString(),
      _id: doctor._id.toString(),
    } as Doctor;
  }
  
  // Try fuzzy matching on preferredName
  const allDoctors = await doctorsCollection.find({ isActive: true }).toArray();
  for (const d of allDoctors) {
    if (fuzzyMatch(name, d.preferredName)) {
      return {
        ...d,
        id: d._id.toString(),
        _id: d._id.toString(),
      } as Doctor;
    }
    
    // Check aliases
    for (const alias of d.aliases || []) {
      if (fuzzyMatch(name, alias)) {
        return {
          ...d,
          id: d._id.toString(),
          _id: d._id.toString(),
        } as Doctor;
      }
    }
  }
  
  return null;
}

export async function createDoctor(name: string): Promise<Doctor> {
  const db = await getDatabase();
  const doctorsCollection = db.collection('doctors');
  
  // Normalize the name
  const normalizedName = normalizeDoctorName(name);
  const displayName = name.trim();
  
  const now = new Date();
  const newDoctor = {
    preferredName: displayName,
    aliases: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await doctorsCollection.insertOne(newDoctor);
  
  return {
    ...newDoctor,
    id: result.insertedId.toString(),
    _id: result.insertedId.toString(),
  } as Doctor;
}

export async function getAllDoctors(): Promise<Doctor[]> {
  const db = await getDatabase();
  const doctorsCollection = db.collection('doctors');
  
  const doctors = await doctorsCollection
    .find({ isActive: true })
    .sort({ preferredName: 1 })
    .toArray();
  
  return doctors.map(doctor => ({
    ...doctor,
    id: doctor._id.toString(),
    _id: doctor._id.toString(),
  })) as Doctor[];
}

export async function addAliasToDoctor(doctorId: string, alias: string): Promise<void> {
  const db = await getDatabase();
  const doctorsCollection = db.collection('doctors');
  
  await doctorsCollection.updateOne(
    { _id: new ObjectId(doctorId) },
    { 
      $addToSet: { aliases: alias },
      $set: { updatedAt: new Date() }
    }
  );
}

