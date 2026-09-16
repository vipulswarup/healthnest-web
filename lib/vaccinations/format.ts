export type Vaccination = {
  id: string;
  patientId: string;
  vaccineName: string;
  doseLabel: string;
  administeredDate: string;
  provider: string;
  lotNumber: string;
  site: string;
  nextDueDate: string | null;
  notes: string;
  createdAt: string;
};

export function formatVaccineDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

export function vaccinationLine(vaccination: Pick<Vaccination, 'vaccineName' | 'doseLabel' | 'administeredDate' | 'nextDueDate' | 'provider'>) {
  const when = formatVaccineDate(vaccination.administeredDate);
  const dose = vaccination.doseLabel.trim() ? ` (${vaccination.doseLabel.trim()})` : '';
  const provider = vaccination.provider.trim() ? ` · ${vaccination.provider.trim()}` : '';
  return `${vaccination.vaccineName}${dose} · ${when}${provider}`;
}

export function upcomingVaccinationLine(vaccination: Pick<Vaccination, 'vaccineName' | 'doseLabel' | 'nextDueDate'>) {
  if (!vaccination.nextDueDate) return '';
  const dose = vaccination.doseLabel.trim() ? ` (${vaccination.doseLabel.trim()})` : '';
  return `${vaccination.vaccineName}${dose} due ${formatVaccineDate(vaccination.nextDueDate)}`;
}

export function vaccinationsForPacket(options: {
  vaccinations: Vaccination[];
  upcomingLimit?: number;
  historyLimit?: number;
}) {
  const historyLimit = options.historyLimit ?? 10;
  const upcomingLimit = options.upcomingLimit ?? 4;
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = options.vaccinations
    .filter((vaccination) => vaccination.nextDueDate && vaccination.nextDueDate >= today)
    .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)))
    .slice(0, upcomingLimit)
    .map(upcomingVaccinationLine)
    .filter(Boolean);

  const history = [...options.vaccinations]
    .sort((a, b) => b.administeredDate.localeCompare(a.administeredDate))
    .slice(0, historyLimit)
    .map(vaccinationLine);

  const lines: string[] = [];
  if (upcoming.length) {
    lines.push(...upcoming.map((line) => `Due: ${line}`));
  }
  lines.push(...history);
  return lines;
}

export function toVaccination(row: Record<string, unknown>): Vaccination {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    vaccineName: String(row.vaccine_name),
    doseLabel: String(row.dose_label || ''),
    administeredDate: String(row.administered_date).slice(0, 10),
    provider: String(row.provider || ''),
    lotNumber: String(row.lot_number || ''),
    site: String(row.site || ''),
    nextDueDate: row.next_due_date ? String(row.next_due_date).slice(0, 10) : null,
    notes: String(row.notes || ''),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export const COMMON_VACCINES = [
  'BCG',
  'OPV',
  'IPV',
  'DPT',
  'Pentavalent',
  'Hepatitis B',
  'Hib',
  'Rotavirus',
  'PCV',
  'MMR',
  'Varicella',
  'Typhoid',
  'HPV',
  'Influenza',
  'COVID-19',
];
