'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GROQ_AI_CONSENT_TEXT } from '@/lib/legal/beta-acknowledgement';

export default function AiSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetch('/api/users/beta-acknowledgement', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json() as { groqAiEnabled?: boolean; acknowledged?: boolean; error?: string };
        if (!response.ok) throw new Error(body.error || 'Could not load your setting.');
        if (active) {
          setEnabled(body.groqAiEnabled === true);
          if (!body.acknowledged) setError('Complete onboarding before changing this setting.');
        }
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load your setting.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = async (next: boolean) => {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/users/groq-ai-consent', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) });
      const body = await response.json() as { enabled?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save your setting.');
      setEnabled(body.enabled === true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your setting.'); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-3xl px-4 py-10">
    <p className="text-sm font-semibold uppercase tracking-wide text-coral">Settings</p>
    <h1 className="mt-2 text-3xl font-bold text-gray-900">AI document processing</h1>
    <p className="mt-5 leading-7 text-gray-700">{GROQ_AI_CONSENT_TEXT}</p>
    <p className="mt-3 leading-7 text-gray-700">When turned off, you can still save files and enter record details yourself. SanoVault will not send your uploads for Groq AI processing. <Link href="/privacy" className="underline">Read our privacy policy.</Link></p>
    {error && <p role="alert" className="mt-5 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    <label className="mt-7 flex items-center justify-between gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span><span className="block font-semibold text-gray-900">Enable Groq AI</span><span className="mt-1 block text-sm text-gray-600">Optional. Enabled by default for now.</span></span>
      <input type="checkbox" aria-label="Enable Groq AI document processing" checked={enabled} disabled={loading || saving || Boolean(error)} onChange={(event) => void save(event.target.checked)} className="h-5 w-5 accent-indigo-600" />
    </label>
    {loading && <p className="mt-3 text-sm text-gray-600">Loading…</p>}
    {saving && <p className="mt-3 text-sm text-gray-600">Saving…</p>}
  </main>;
}
