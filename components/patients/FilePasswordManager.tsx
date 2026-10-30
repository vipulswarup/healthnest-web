'use client';

import { useCallback, useEffect, useState } from 'react';

type FilePassword = {
  id: string;
  password: string;
  createdAt: string;
};

export function FilePasswordManager({ patientId }: { patientId: string }) {
  const [passwords, setPasswords] = useState<FilePassword[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/patients/${patientId}/file-passwords`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load file passwords');
      setPasswords(Array.isArray(data) ? data : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load file passwords');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const password = draft.trim();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/patients/${patientId}/file-passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save password');
      setDraft('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save password');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/patients/${patientId}/file-passwords/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete password');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900">File passwords</h3>
      <p className="mt-2 text-sm text-gray-600">
        Lab PDFs are often locked with a date of birth. Saved passwords are used for this person on the website, the apps, and Folder Check.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : passwords.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">None saved yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {passwords.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-mono text-sm text-gray-900">{row.password}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(row.id)}
                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Password used on this person's PDFs"
          autoComplete="off"
          className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="min-h-11 rounded-lg bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-strong disabled:opacity-50"
        >
          Save password
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
