'use client';

import { useSession } from '@/lib/auth/client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/layout/AppNav';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useHouseholdContext } from '@/components/households/useHouseholdContext';
import { familyInviteMessage, whatsappShareHref } from '@/lib/share/whatsapp';

type Member = {
  householdId: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  joinedAt: string;
};

type Invite = {
  id: string;
  email: string;
  status: string;
  token: string;
  expiresAt: string;
};

type Patient = { id: string; firstName: string; lastName?: string };

type WhatsAppSenderMap = {
  phone: string;
  householdId: string;
  defaultPatientId: string | null;
};

type OrphanErrorResponse = {
  error?: string;
  details?: { patients?: Array<{ firstName?: string; lastName?: string }> };
};

type PendingAction =
  | { kind: 'unlink-patient'; id: string; label: string }
  | { kind: 'remove-member'; id: string; label: string }
  | { kind: 'revoke-invite'; id: string; label: string }
  | { kind: 'unlink-whatsapp'; id: string; label: string }
  | { kind: 'leave' }
  | { kind: 'dissolve' };

function formatOrphanError(data: unknown): string {
  const response = (data && typeof data === 'object' ? data : {}) as OrphanErrorResponse;
  const names = (response.details?.patients || [])
    .map((patient) => [patient.firstName, patient.lastName].filter(Boolean).join(' '))
    .filter(Boolean);
  if (names.length) {
    return `${response.error || 'Request failed'} Affected: ${names.join(', ')}.`;
  }
  return response.error || 'Request failed';
}

export default function HouseholdDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refresh } = useHouseholdContext();
  const params = useParams();
  const id = String(params.id || '');

  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [linkable, setLinkable] = useState<Patient[]>([]);
  const [linkPatientId, setLinkPatientId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [origin, setOrigin] = useState('https://sanovault.com');
  const [whatsappMaps, setWhatsappMaps] = useState<WhatsAppSenderMap[]>([]);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [hRes, mRes, iRes, pRes, householdsRes, waRes] = await Promise.all([
        fetch(`/api/households/${id}`),
        fetch(`/api/households/${id}/members`),
        fetch(`/api/households/${id}/invites`),
        fetch(`/api/households/${id}/patients`),
        fetch('/api/households'),
        fetch(`/api/whatsapp/sender-map?householdId=${encodeURIComponent(id)}`),
      ]);
      if (!hRes.ok) throw new Error('Household not found');
      const household = await hRes.json();
      setName(household.name);
      setEditName(household.name);
      if (mRes.ok) setMembers(await mRes.json());
      if (iRes.ok) setInvites(await iRes.json());
      if (waRes.ok) setWhatsappMaps(await waRes.json());
      else setWhatsappMaps([]);
      const householdPatients: Patient[] = pRes.ok ? await pRes.json() : [];
      setPatients(householdPatients);

      // Build linkable list: patients from other households user can access
      if (householdsRes.ok) {
        const households = await householdsRes.json();
        const linkedIds = new Set(householdPatients.map((p) => p.id));
        const others: Patient[] = [];
        for (const h of households) {
          if (h.id === id) continue;
          const op = await fetch(`/api/households/${h.id}/patients`);
          if (!op.ok) continue;
          const list: Patient[] = await op.json();
          for (const p of list) {
            if (!linkedIds.has(p.id) && !others.some((o) => o.id === p.id)) others.push(p);
          }
        }
        setLinkable(others);
        setLinkPatientId(others[0]?.id || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    void load();
  }, [session, status, router, load]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename');
      setName(data.name);
      setMessage('Household renamed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/households/${id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite');
      setInviteEmail('');
      setInviteUrl(data.acceptUrl || `${origin}/households/invites/${data.token}`);
      setMessage(
        data.emailSent
          ? `Invite created for ${data.email}. Send it on WhatsApp too.`
          : `Invite created for ${data.email}. Send the WhatsApp link below.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setBusy(false);
    }
  };

  const linkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPatientId) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: linkPatientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to link patient');
      setMessage('Patient linked to household');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link');
    } finally {
      setBusy(false);
    }
  };

  const unlinkPatient = async (patientId: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}/patients/${patientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(formatOrphanError(data));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink');
    } finally {
      setBusy(false);
    }
  };

  const linkWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/whatsapp/sender-map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappPhone, householdId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not link WhatsApp number');
      setWhatsappPhone('');
      setMessage(`Linked WhatsApp +${data.phone}. Forward reports to the SanoVault WhatsApp number, then pick who they belong to.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link WhatsApp');
    } finally {
      setBusy(false);
    }
  };

  const unlinkWhatsApp = async (phone: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/whatsapp/sender-map?phone=${encodeURIComponent(phone)}&householdId=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not unlink');
      setMessage('WhatsApp number unlinked.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlink WhatsApp');
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}/invites/${inviteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}/members/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatOrphanError(data));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}/leave`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(formatOrphanError(data));
      await refresh();
      router.push('/households');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave');
      setBusy(false);
    }
  };

  const dissolve = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/households/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(formatOrphanError(data));
      await refresh();
      router.push('/households');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dissolve');
      setBusy(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const currentUserId = session.user?.id;
  const confirmAction = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.kind === 'unlink-patient') void unlinkPatient(action.id);
    if (action.kind === 'remove-member') void removeMember(action.id);
    if (action.kind === 'revoke-invite') void revokeInvite(action.id);
    if (action.kind === 'unlink-whatsapp') void unlinkWhatsApp(action.id);
    if (action.kind === 'leave') void leave();
    if (action.kind === 'dissolve') void dissolve();
  };

  const confirmationCopy = (() => {
    if (!pendingAction) return { title: '', description: '', label: 'Confirm', tone: 'danger' as const };
    if (pendingAction.kind === 'unlink-patient') return {
      title: `Unlink ${pendingAction.label}?`,
      description: 'This removes access through this household. The patient must remain linked to at least one other household.',
      label: 'Unlink patient', tone: 'danger' as const,
    };
    if (pendingAction.kind === 'remove-member') return {
      title: `Remove ${pendingAction.label}?`,
      description: 'They will immediately lose access to this household and its patients unless they have access elsewhere.',
      label: 'Remove member', tone: 'danger' as const,
    };
    if (pendingAction.kind === 'revoke-invite') return {
      title: `Revoke the invite for ${pendingAction.label}?`,
      description: 'The existing invitation link will stop working.',
      label: 'Revoke invite', tone: 'danger' as const,
    };
    if (pendingAction.kind === 'unlink-whatsapp') return {
      title: `Unlink +${pendingAction.label}?`,
      description: 'Reports forwarded from this WhatsApp number will no longer be accepted for this family folder.',
      label: 'Unlink WhatsApp', tone: 'danger' as const,
    };
    if (pendingAction.kind === 'leave') return {
      title: 'Leave this household?',
      description: 'You will lose access to this household and its patients unless they are also linked to another household you belong to.',
      label: 'Leave household', tone: 'warning' as const,
    };
    return {
      title: 'Dissolve this household?',
      description: 'This removes the household for everyone. Patients that exist only here must be linked elsewhere first.',
      label: 'Dissolve household', tone: 'danger' as const,
    };
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  People in this folder can see the same family reports.
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}
              {message && (
                <div className="rounded-md bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm break-all">
                  {message}
                </div>
              )}

              <form onSubmit={rename} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
                  required
                />
                <button type="submit" disabled={busy} className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  Rename
                </button>
              </form>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">People in this folder</h2>
                {patients.length === 0 ? (
                  <p className="text-sm text-gray-600 mb-3">No one yet. <Link href="/patients/new" className="text-coral hover:underline">Add a Person</Link>.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden mb-3">
                    {patients.map((p) => (
                      <li key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <Link href={`/patients/${p.id}`} className="font-medium text-gray-900 hover:text-coral">
                          {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingAction({ kind: 'unlink-patient', id: p.id, label: [p.firstName, p.lastName].filter(Boolean).join(' ') })}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Unlink
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {linkable.length > 0 && (
                  <form onSubmit={linkPatient} className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={linkPatientId}
                      onChange={(e) => setLinkPatientId(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
                    >
                      {linkable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {[p.firstName, p.lastName].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                    <button type="submit" disabled={busy} className="bg-coral text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                      Link existing person
                    </button>
                  </form>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">WhatsApp intake</h2>
                <p className="mb-3 text-sm text-gray-600">
                  Link a phone number so forwards to the SanoVault WhatsApp business number are filed here.
                  After each forward you will pick who the report belongs to in WhatsApp.
                </p>
                {whatsappMaps.length > 0 && (
                  <ul className="mb-3 divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {whatsappMaps.map((map) => (
                      <li key={map.phone} className="flex items-center justify-between gap-3 px-4 py-3">
                        <p className="font-medium text-gray-900">+{map.phone}</p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingAction({ kind: 'unlink-whatsapp', id: map.phone, label: map.phone })}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Unlink
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={linkWhatsApp} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="flex-1 min-h-12 border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900 bg-white placeholder:text-gray-500"
                    required
                  />
                  <button type="submit" disabled={busy} className="min-h-12 bg-coral text-white px-4 py-2 rounded-md text-base font-medium hover:bg-coral-strong disabled:opacity-50">
                    Link WhatsApp number
                  </button>
                </form>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Members</h2>
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {members.map((m) => (
                    <li key={m.userId} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || m.userId}
                          {m.userId === currentUserId ? ' (you)' : ''}
                        </p>
                        {m.email && <p className="text-sm text-gray-700">{m.email}</p>}
                      </div>
                      {m.userId !== currentUserId && (
                        <button type="button" disabled={busy} onClick={() => setPendingAction({ kind: 'remove-member', id: m.userId, label: [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || 'this member' })} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Invite someone</h2>
                <p className="mb-3 text-sm text-gray-600">Send a WhatsApp link. Add their Google email if you know it.</p>
                <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="their-google@email.com"
                    className="flex-1 min-h-12 border border-gray-300 rounded-md px-3 py-2 text-base text-gray-900 bg-white placeholder:text-gray-500"
                    required
                  />
                  <button type="submit" disabled={busy} className="min-h-12 bg-coral text-white px-4 py-2 rounded-md text-base font-medium hover:bg-coral-strong disabled:opacity-50">
                    Create invite
                  </button>
                </form>
                {inviteUrl && (
                  <a
                    href={whatsappShareHref(familyInviteMessage(session.user?.name || 'A family member', inviteUrl))}
                    className="mt-3 inline-flex min-h-12 items-center text-base font-medium text-coral hover:underline"
                  >
                    Send this invite on WhatsApp
                  </a>
                )}
                {invites.filter((i) => i.status === 'pending').length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {invites
                      .filter((i) => i.status === 'pending')
                      .map((invite) => {
                        const acceptUrl = `${origin}/households/invites/${invite.token}`;
                        return (
                        <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900">
                          <span>
                            {invite.email} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-3">
                            <a
                              href={whatsappShareHref(familyInviteMessage(session.user?.name || 'A family member', acceptUrl))}
                              className="font-medium text-coral hover:underline"
                            >
                              WhatsApp
                            </a>
                            <button type="button" disabled={busy} onClick={() => setPendingAction({ kind: 'revoke-invite', id: invite.id, label: invite.email })} className="text-red-600 hover:underline disabled:opacity-50">
                              Revoke
                            </button>
                          </div>
                        </li>
                        );
                      })}
                  </ul>
                )}
              </section>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                <button type="button" disabled={busy} onClick={() => setPendingAction({ kind: 'leave' })} className="text-sm font-medium text-amber-800 hover:underline disabled:opacity-50">
                  Leave household
                </button>
                <button type="button" disabled={busy} onClick={() => setPendingAction({ kind: 'dissolve' })} className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50">
                  Dissolve household
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmationCopy.title}
        description={confirmationCopy.description}
        confirmLabel={confirmationCopy.label}
        tone={confirmationCopy.tone}
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
