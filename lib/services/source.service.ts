import { getDatabase } from '../mongodb';
import { HealthcareSource } from '../types/healthcare-source.types';

function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function fuzzyMatch(str1: string, str2: string): boolean {
  const normalized1 = normalizeSourceName(str1);
  const normalized2 = normalizeSourceName(str2);
  
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

export async function findSourceByName(name: string): Promise<HealthcareSource | null> {
  if (!name || !name.trim()) return null;
  
  const db = await getDatabase();
  const sourcesCollection = db.collection('healthcare_sources');
  
  const normalizedSearch = normalizeSourceName(name);
  
  // First try exact match on preferredName
  let source = await sourcesCollection.findOne({
    preferredName: { $regex: new RegExp(`^${normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isActive: true
  });
  
  if (source) {
    return {
      ...source,
      id: source._id.toString(),
      _id: source._id.toString(),
    } as HealthcareSource;
  }
  
  // Try matching against aliases
  source = await sourcesCollection.findOne({
    aliases: { $regex: new RegExp(`^${normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isActive: true
  });
  
  if (source) {
    return {
      ...source,
      id: source._id.toString(),
      _id: source._id.toString(),
    } as HealthcareSource;
  }
  
  // Try fuzzy matching on preferredName
  const allSources = await sourcesCollection.find({ isActive: true }).toArray();
  for (const s of allSources) {
    if (fuzzyMatch(name, s.preferredName)) {
      return {
        ...s,
        id: s._id.toString(),
        _id: s._id.toString(),
      } as HealthcareSource;
    }
    
    // Check aliases
    for (const alias of s.aliases || []) {
      if (fuzzyMatch(name, alias)) {
        return {
          ...s,
          id: s._id.toString(),
          _id: s._id.toString(),
        } as HealthcareSource;
      }
    }
  }
  
  return null;
}

export async function createSource(name: string): Promise<HealthcareSource> {
  const db = await getDatabase();
  const sourcesCollection = db.collection('healthcare_sources');
  
  const now = new Date();
  const newSource = {
    preferredName: name.trim(),
    aliases: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await sourcesCollection.insertOne(newSource);
  
  return {
    ...newSource,
    id: result.insertedId.toString(),
    _id: result.insertedId.toString(),
  } as HealthcareSource;
}

export async function getAllSources(): Promise<HealthcareSource[]> {
  const db = await getDatabase();
  const sourcesCollection = db.collection('healthcare_sources');
  
  const sources = await sourcesCollection
    .find({ isActive: true })
    .sort({ preferredName: 1 })
    .toArray();
  
  return sources.map(source => ({
    ...source,
    id: source._id.toString(),
    _id: source._id.toString(),
  })) as HealthcareSource[];
}

