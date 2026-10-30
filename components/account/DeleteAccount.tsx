'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth/client';
type Preview = { families: Array<{ id: string; name: string; will_delete: boolean }>; needsAppleReauthentication: boolean };
export function DeleteAccount() {
  const { data: session, status } = useSession();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!session) return;
    let active = true;
    fetch('/api/users/me/deletion', { cache: 'no-store' }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not load deletion details');
      if (active) setPreview(data);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [session]);
  async function remove() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/users/me/deletion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not delete account');
      setDone(true);
      await signOut().catch(() => undefined);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete account'); }
    finally { setBusy(false); }
  }
  if (done) return <p role="status" className="rounded-xl bg-sage/20 p-5">Your account data has been removed and access revoked. Stored-file and sign-in-provider cleanup is processing.</p>;
  if (status === 'loading') return <p>Loading account…</p>;
  if (!session) return <Link className="inline-block rounded-lg bg-coral px-5 py-3 text-white" href="/auth/signin?callbackUrl=%2Fdelete-account">Sign in to delete your account</Link>;
  return <section className="space-y-4 rounded-xl border border-red-200 p-5">
    <h2 className="text-xl font-semibold">Delete {session.user.email}</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {preview && <>
      {preview.families.length > 0 && <ul className="list-disc pl-5 space-y-2">{preview.families.map(f => <li key={f.id}>{f.name}: {f.will_delete ? 'will be deleted' : 'will remain for other members'}</li>)}</ul>}
      {preview.needsAppleReauthentication ? <p>For an older Apple sign-in, delete your account in the SanoVault iOS app and confirm with Apple, or use the email request below.</p> : <>
        <p>This cannot be undone.</p>
        <label className="block" htmlFor="delete-confirmation">Type DELETE to confirm</label>
        <input id="delete-confirmation" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full rounded-lg border border-silver p-3" disabled={busy} />
        <button disabled={busy || confirmation !== 'DELETE'} onClick={remove} className="rounded-lg bg-red-700 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Deleting…' : 'Permanently delete my account'}</button>
      </>}
    </>}
  </section>;
}
