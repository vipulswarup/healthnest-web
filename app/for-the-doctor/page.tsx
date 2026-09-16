'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNav from '@/components/layout/AppNav';
import PersonPicker from '@/components/patients/PersonPicker';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { useSession } from '@/lib/auth/client';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import { doctorPacketWhatsAppText } from '@/lib/reports/doctor-packet';
import { Sparkline } from '@/components/lab/Sparkline';
import { svBtnOutline, svBtnPrimary } from '@/lib/ui/buttons';
import { whatsappShareHref } from '@/lib/share/whatsapp';
import dynamic from 'next/dynamic';

const ShareCopy = dynamic(
  () => import('@/components/documents/ShareCopy').then((mod) => mod.ShareCopy),
  { ssr: false },
);

type Patient = { id: string; firstName: string; lastName?: string };

type Packet = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    age: number | null;
    gender: string;
    bloodGroup: string;
  };
  conditions: string[];
  medicines: Array<{ id: string; line: string; detailLine: string; warning: boolean }>;
  labHighlights: string[];
  labTrends?: Array<{ metric: string; label: string; line: string; values: number[]; direction: string }>;
  bloodPressure: { available: boolean; lines: string[] };
  growth: { available: boolean; lines: string[]; latest: { heightCm: number | null; weightKg: number | null; measuredAt: string | null } };
  vaccinations: { available: boolean; upcoming: Array<{ id: string; vaccineName: string; doseLabel: string; nextDueDate: string }>; lines: string[] };
  visitNotes: { nextAppointment: string | null; lines: string[] };
  documents: Array<{ id: string; documentId: string | null; label: string; href: string }>;
};

function personName(person: { firstName: string; lastName?: string }) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function ForTheDoctorContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { householdId, households, loading: householdsLoading } = useHouseholdContext();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('https://sanovault.com');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (status === 'loading' || householdsLoading) return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    if (!householdId || households.length === 0) return;

    let active = true;
    void fetch('/api/patients')
      .then(async (response) => {
        const data = await response.json() as Patient[] | { error?: string };
        if (!response.ok) throw new Error((data as { error?: string }).error || 'Could not load family');
        if (active) setPatients(data as Patient[]);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load family');
      });

    return () => { active = false; };
  }, [householdId, households.length, householdsLoading, router, session, status]);

  const requestedPatientId = searchParams.get('patientId');

  useEffect(() => {
    const stored = getLastPatientId();
    const valid = stored && patients.some((patient) => patient.id === stored) ? stored : null;
    setLastPatientIdState(valid);
    const fromQuery = requestedPatientId && patients.some((patient) => patient.id === requestedPatientId)
      ? requestedPatientId
      : valid;
    if (fromQuery) setSelectedId(fromQuery);
  }, [patients, requestedPatientId]);

  const loadPacket = useCallback(async (patientId: string) => {
    setError('');
    setPacket(null);
    setPacketLoading(true);
    try {
      const response = await fetch(`/api/reports/doctor-packet?patientId=${patientId}`);
      const data = await response.json() as Packet | { error?: string };
      if (!response.ok) throw new Error((data as { error?: string }).error || 'Could not prepare the packet');
      const loaded = data as Packet;
      setPacket(loaded);
    } finally {
      setPacketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPacket(null);
      return;
    }
    let active = true;
    void loadPacket(selectedId).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Could not prepare the packet');
    });
    return () => { active = false; };
  }, [loadPacket, selectedId]);

  const selectPerson = (id: string) => {
    setLastPatientId(id);
    setSelectedId(id);
    router.replace(`/for-the-doctor?patientId=${id}`, { scroll: false });
  };

  const selected = patients.find((patient) => patient.id === selectedId);
  const name = packet ? personName(packet.patient) : selected ? personName(selected) : '';
  const identityBits = packet
    ? [
        packet.patient.age !== null ? `${packet.patient.age} years` : '',
        packet.patient.gender,
        packet.patient.bloodGroup ? `Blood group ${packet.patient.bloodGroup}` : '',
      ].filter(Boolean)
    : [];
  const identityLine = identityBits.join(' · ');

  const whatsappHref = useMemo(() => {
    if (!packet || !selectedId) return '';
    return whatsappShareHref(doctorPacketWhatsAppText({
      origin,
      patientId: selectedId,
      name,
      identityLine,
      conditions: packet.conditions,
      medicines: packet.medicines.map((medication) => medication.line),
      labHighlights: packet.labHighlights,
      labTrends: (packet.labTrends || []).map((trend) => trend.line),
      bloodPressure: packet.bloodPressure.lines,
      growth: packet.growth.lines,
      vaccinations: packet.vaccinations.lines,
      visitNotes: packet.visitNotes.lines,
      documents: packet.documents.map((document) => ({
        label: document.label,
        href: `${origin.replace(/\/$/, '')}${document.href}`,
      })),
    }));
  }, [identityLine, name, origin, packet, selectedId]);

  if (status === 'loading' || householdsLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="print:hidden">
          <h1 className="text-3xl font-bold tracking-tight text-ink">For the Doctor</h1>
          <p className="mt-2 text-base text-blue-slate">One Page for a Clinic Visit. Print it, or send it on WhatsApp.</p>
        </div>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden">{error}</div>}

        {households.length === 0 ? (
          <p className="mt-8 text-gray-600 print:hidden">Ask a family member to add you to the family folder first.</p>
        ) : patients.length === 0 ? (
          <p className="mt-8 text-gray-600 print:hidden">Add a Person First, then you can show a doctor their file.</p>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="print:hidden">
              <PersonPicker
                people={patients}
                selectedId={selectedId || undefined}
                lastUsedId={lastPatientId}
                onSelect={selectPerson}
              />
            </div>

            {selected && packetLoading && (
              <p className="text-gray-600 print:hidden" role="status">Preparing the packet…</p>
            )}

            {selected && packet && (
              <>
                <div className="flex flex-wrap gap-3 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={svBtnPrimary}
                  >
                    Print
                  </button>
                  <a
                    href={whatsappHref}
                    className={`${svBtnOutline} border-silver`}
                  >
                    Send on WhatsApp
                  </a>
                  <Link
                    href={`/visit-notes?patientId=${selectedId}`}
                    className={svBtnOutline}
                  >
                    Visit Notes
                  </Link>
                  <ShareCopy
                    documents={packet.documents
                      .filter((document) => document.documentId)
                      .map((document) => ({ id: document.documentId as string, label: document.label }))}
                    cover={{
                      title: name,
                      identityLine,
                      sections: [
                        { heading: 'Conditions', lines: packet.conditions },
                        { heading: 'Current Medicines', lines: packet.medicines.map((medication) => medication.line) },
                        { heading: 'Lab Highlights', lines: packet.labHighlights },
                        { heading: 'Lab Trends', lines: (packet.labTrends || []).map((trend) => trend.line) },
                        { heading: 'Blood Pressure', lines: packet.bloodPressure.lines },
                        { heading: 'Height & Weight', lines: packet.growth.lines },
                        { heading: 'Vaccinations', lines: packet.vaccinations.lines },
                        { heading: 'Visit Notes', lines: packet.visitNotes.lines },
                      ],
                    }}
                    defaultWatermark={`Confidential — For the Treating Doctor — ${name}`}
                    defaultFileName={`${name.replace(/\s+/g, '-')}-doctor-packet.pdf`}
                  />
                </div>

                <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
                  <p className="text-sm font-medium uppercase tracking-wide text-coral">For the Doctor</p>
                  <h2 className="mt-1 text-4xl font-bold tracking-tight text-ink">{name}</h2>
                  {identityLine && <p className="mt-2 text-lg text-gray-700">{identityLine}</p>}

                  <section className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-950">Conditions</h3>
                    {packet.conditions.length === 0 ? (
                      <p className="mt-2 text-gray-600">None recorded.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.conditions.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Current Medicines</h3>
                    {packet.medicines.length === 0 ? (
                      <p className="mt-2 text-gray-600">None recorded.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-gray-800">
                        {packet.medicines.map((medication) => (
                          <li key={medication.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <details>
                              <summary className="cursor-pointer list-none font-medium text-gray-950 marker:content-none [&::-webkit-details-marker]:hidden">
                                <span className="text-coral">{medication.line}</span>
                              </summary>
                              <div className="mt-2 space-y-2 text-sm text-gray-700">
                                <p>{medication.detailLine}</p>
                                {medication.warning ? (
                                  <p className="font-medium text-amber-900">
                                    Composition needs confirmation before clinical use.
                                  </p>
                                ) : null}
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Lab Highlights</h3>
                    {packet.labHighlights.length === 0 ? (
                      <p className="mt-2 text-gray-600">No recent lab highlights.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.labHighlights.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-ink">Lab Trends</h3>
                    {(packet.labTrends || []).length === 0 ? (
                      <p className="mt-2 text-gray-600">Need two lab dates for a trend. Open Blood Work after more reports are read.</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {(packet.labTrends || []).map((trend) => (
                          <li key={trend.metric} className="flex flex-col gap-2 rounded-xl border border-silver px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-gray-800">{trend.line}</p>
                            <Sparkline values={trend.values} />
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={`/reports/blood-summary?patientId=${selectedId}`}
                      className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-coral hover:underline print:hidden"
                    >
                      Open Blood Work
                    </Link>
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Blood Pressure</h3>
                    {packet.bloodPressure.lines.length === 0 ? (
                      <p className="mt-2 text-gray-600">Not logged in SanoVault yet.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.bloodPressure.lines.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Height & Weight</h3>
                    {packet.growth.lines.length === 0 ? (
                      <p className="mt-2 text-gray-600">Not logged yet.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.growth.lines.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                    <Link
                      href={`/growth?patientId=${selectedId}`}
                      className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-coral hover:underline print:hidden"
                    >
                      Log Height & Weight
                    </Link>
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Vaccinations</h3>
                    {packet.vaccinations.lines.length === 0 ? (
                      <p className="mt-2 text-gray-600">None recorded.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.vaccinations.lines.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                    <Link
                      href={`/vaccinations?patientId=${selectedId}`}
                      className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-coral hover:underline print:hidden"
                    >
                      Add Vaccinations
                    </Link>
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Visit Notes</h3>
                    {packet.visitNotes.lines.length === 0 ? (
                      <p className="mt-2 text-gray-600">None yet.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                        {packet.visitNotes.lines.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                    <Link
                      href={`/visit-notes?patientId=${selectedId}`}
                      className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-coral hover:underline print:hidden"
                    >
                      Add or Edit Visit Notes
                    </Link>
                  </section>

                  <section className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-950">Reports</h3>
                    {packet.documents.length === 0 ? (
                      <p className="mt-2 text-gray-600">No attached files yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {packet.documents.map((document) => (
                          <li key={document.id}>
                            <Link href={document.href} className="text-coral hover:underline">
                              {document.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </article>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ForTheDoctorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-50 text-gray-600" role="status">Loading…</div>}>
      <ForTheDoctorContent />
    </Suspense>
  );
}
