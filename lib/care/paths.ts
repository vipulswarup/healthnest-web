export function carePatientBase(token: string, patientId: string) {
  return `/care/${token}/patients/${patientId}`;
}

export function careApiBase(token: string, patientId: string) {
  return `/api/care/${token}/patients/${patientId}`;
}
