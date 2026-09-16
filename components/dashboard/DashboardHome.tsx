'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/layout/AppNav';
import { PersonCardActions } from '@/components/dashboard/PersonCardActions';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { humanizeLabel } from '@/lib/constants/labels';
import type { DashboardHome } from '@/lib/dashboard/load-home';
import { getLastPatientId, setLastPatientId } from '@/lib/patients/last-used';
import { svBtnOutline, svBtnPrimary } from '@/lib/ui/buttons';

type Patient = DashboardHome['patients'][number];
type HealthRecord = DashboardHome['records'][number];

function personName(person: Patient) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}

export function DashboardHome({
  firstName,
  userLabel,
  initial,
}: {
  firstName: string;
  userLabel: string;
  initial: DashboardHome;
}) {
  const router = useRouter();
  const { householdId, hydrate } = useHouseholdContext();
  const [home, setHome] = useState(initial);
  const [error, setError] = useState('');
  const [lastPatientId, setLastPatientIdState] = useState<string | null>(null);

  useLayoutEffect(() => {
    hydrate({ householdId: initial.householdId, households: initial.households });
  }, [hydrate, initial.householdId, initial.households]);

  useEffect(() => {
    setHome(initial);
  }, [initial]);

  useEffect(() => {
    if (!householdId || householdId === home.householdId) return;
    let active = true;
    void fetch('/api/dashboard')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load your home screen');
        return response.json() as Promise<DashboardHome>;
      })
      .then((data) => {
        if (!active) return;
        hydrate({ householdId: data.householdId, households: data.households });
        setHome(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your home screen');
      });
    return () => { active = false; };
  }, [home.householdId, householdId, hydrate]);

  useEffect(() => {
    const stored = getLastPatientId();
    setLastPatientIdState(stored && home.patients.some((patient) => patient.id === stored) ? stored : null);
  }, [home.patients]);

  const people = useMemo(() => {
    const patients = home.patients;
    if (!lastPatientId) return patients;
    return [...patients].sort((a, b) => Number(b.id === lastPatientId) - Number(a.id === lastPatientId));
  }, [home.patients, lastPatientId]);

  const recordsByPerson = useMemo(() => {
    const grouped = new Map<string, HealthRecord[]>();
    for (const record of home.records) {
      const list = grouped.get(record.patientId) || [];
      list.push(record);
      grouped.set(record.patientId, list);
    }
    return grouped;
  }, [home.records]);

  const openAdd = (id: string) => {
    setLastPatientId(id);
    router.push(`/health-records/new?patientId=${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav userLabel={userLabel} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Family{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-blue-slate">Choose a Person, Add a Report, or Open What a Doctor Needs.</p>
          </div>
          <Link href="/patients/new" prefetch={false} className={svBtnOutline}>
            Add a Person
          </Link>
        </div>

        {home.households.length === 0 && (
          <section className="mt-8 rounded-2xl border border-silver bg-white p-6">
            <h2 className="text-lg font-semibold text-ink">No Family Folder Yet</h2>
            <p className="mt-1 text-base text-blue-slate">If someone invited you, open the WhatsApp link they sent. Otherwise ask a family member to add you.</p>
            <Link href="/households" prefetch={false} className={`${svBtnPrimary} mt-4`}>Who Can See This</Link>
          </section>
        )}

        {home.pending.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="pending-invites-title">
            <h2 id="pending-invites-title" className="font-semibold text-amber-950">You Have an Invite</h2>
            <ul className="mt-3 divide-y divide-amber-200">
              {home.pending.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-base text-amber-950">
                  <span>{invite.invitedByName || 'A Family Member'} invited you to {invite.householdName || 'the family folder'}.</span>
                  <Link href={`/households/invites/${invite.token}`} prefetch={false} className="min-h-11 font-medium text-coral hover:underline">Open Invite</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">{error}</div>}

        {home.households.length > 0 && people.length === 0 && (
          <section className="mt-8 rounded-2xl border border-silver bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Add Someone to This Folder</h2>
            <p className="mt-2 text-base text-blue-slate">Add Dad, your daughter, or anyone whose reports you keep here.</p>
            <Link href="/patients/new" prefetch={false} className={`${svBtnPrimary} mt-6`}>
              Add a Person
            </Link>
          </section>
        )}

        {home.households.length > 0 && people.length > 0 && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Family">
            {people.map((person) => {
              const recent = recordsByPerson.get(person.id) || [];
              const name = personName(person);
              return (
                <article key={person.id} className="h-full rounded-2xl border border-silver bg-white p-5 shadow-sm">
                  <h2 className="text-2xl font-bold text-ink">{name}</h2>
                  <p className={`mt-1 min-h-6 text-sm font-medium ${person.id === lastPatientId ? 'text-coral' : 'invisible'}`}>
                    Last Used
                  </p>
                  <PersonCardActions
                    patientId={person.id}
                    onAddReport={() => openAdd(person.id)}
                    onNavigate={() => setLastPatientId(person.id)}
                  />
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-blue-slate">Recent Files</p>
                      <Link
                        href={`/health-records?patientId=${person.id}`}
                        prefetch={false}
                        onClick={() => setLastPatientId(person.id)}
                        className="text-sm font-medium text-coral hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    {recent.length === 0 ? (
                      <p className="mt-2 text-base text-gray-600">None yet.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-gray-100">
                        {recent.map((record) => (
                          <li key={record.id}>
                            <Link
                              href={`/health-records/${record.id}`}
                              prefetch={false}
                              className="flex min-h-12 items-center justify-between gap-3 py-2 text-base text-ink hover:text-coral"
                            >
                              <span className="truncate">{humanizeLabel(record.recordType)}</span>
                              <time className="shrink-0 text-sm text-gray-500">{formatDate(record.documentDate || record.createdAt)}</time>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
