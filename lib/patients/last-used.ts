const STORAGE_KEY = 'sanovault.lastPatientId';

export function getLastPatientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLastPatientId(patientId: string) {
  if (typeof window === 'undefined' || !patientId) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, patientId);
  } catch {
    // Ignore private-mode quota errors.
  }
}
