import { getDatabase } from '../mongodb';
import { HealthRecordCategory } from '../types/health-record-category.types';

let categoriesCache: HealthRecordCategory[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCategoryByCode(code: string): Promise<HealthRecordCategory | null> {
  const categories = await getAllCategories();
  return categories.find(cat => cat.code === code) || null;
}

export async function getAllCategories(): Promise<HealthRecordCategory[]> {
  const now = Date.now();
  
  // Return cached categories if still valid
  if (categoriesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return categoriesCache;
  }

  const db = await getDatabase();
  const categoriesCollection = db.collection('health_record_categories');
  
  const categories = await categoriesCollection
    .find({ isActive: true })
    .sort({ displayName: 1 })
    .toArray();

  categoriesCache = categories.map(cat => ({
    ...cat,
    id: cat._id.toString(),
    _id: cat._id.toString(),
  })) as HealthRecordCategory[];
  
  cacheTimestamp = now;
  return categoriesCache;
}

export function getCategoryDisplayName(code: string, categories: HealthRecordCategory[]): string {
  const category = categories.find(cat => cat.code === code);
  return category?.displayName || code;
}

