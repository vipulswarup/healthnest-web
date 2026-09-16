export type VisitNote = {
  id: string;
  patientId: string;
  noteDate: string;
  observed: string;
  askDoctor: string;
  pinned: boolean;
  createdAt: string;
};

export function formatNoteDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

export function visitNoteLine(note: Pick<VisitNote, 'noteDate' | 'observed' | 'askDoctor' | 'pinned'>) {
  const parts: string[] = [];
  const when = formatNoteDate(note.noteDate);
  if (note.observed.trim()) parts.push(`Noticed: ${note.observed.trim()}`);
  if (note.askDoctor.trim()) parts.push(`Ask: ${note.askDoctor.trim()}`);
  if (parts.length === 0) return `${when}${note.pinned ? ' (pinned)' : ''}`;
  return `${when}${note.pinned ? ' · pinned' : ''} — ${parts.join(' · ')}`;
}

export function visitNotesForPacket(options: {
  notes: VisitNote[];
  nextAppointment: string | null;
  legacyPleaseAsk?: string;
  limit?: number;
}) {
  const limit = options.limit ?? 8;
  const sorted = [...options.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.noteDate.localeCompare(a.noteDate) || b.createdAt.localeCompare(a.createdAt);
  });
  const lines: string[] = [];
  if (options.nextAppointment) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const past = options.nextAppointment < today;
    lines.push(
      past
        ? `Last appointment: ${formatNoteDate(options.nextAppointment)} (past)`
        : `Next appointment: ${formatNoteDate(options.nextAppointment)}`,
    );
  }
  for (const note of sorted.slice(0, limit)) {
    lines.push(visitNoteLine(note));
  }
  const legacy = (options.legacyPleaseAsk || '').trim().split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of legacy) {
    if (!lines.some((existing) => existing.includes(line))) lines.push(line);
  }
  return lines;
}

export function toVisitNote(row: Record<string, unknown>): VisitNote {
  const noteDate = String(row.note_date).slice(0, 10);
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    noteDate,
    observed: String(row.observed || ''),
    askDoctor: String(row.ask_doctor || ''),
    pinned: Boolean(row.pinned),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}
