import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { DeleteAccount } from '@/components/account/DeleteAccount';
export const metadata: Metadata = { title: 'Delete your SanoVault account', alternates: { canonical: '/delete-account' } };
export default function DeleteAccountPage() {
  return <MarketingShell><main className="mx-auto max-w-2xl px-4 py-12 space-y-6">
    <h1 className="text-3xl font-bold">Delete your SanoVault account</h1>
    <p>Delete your login, profile and access to SanoVault. Families with other members and their shared records remain; a remaining member takes over families you created. Families where you are the last member, and patients belonging only to those families, are permanently deleted.</p>
    <p>A patient profile is separate from a login. Remove a patient from a family on the family management page. Their records are deleted only if no other family has them. Download anything you want to keep first.</p>
    <DeleteAccount />
    <section className="rounded-xl border border-silver p-5 space-y-3">
      <h2 className="text-xl font-semibold">Cannot sign in, or prefer to request deletion?</h2>
      <p>Email <a className="text-coral underline" href="mailto:support@eisenvault.com?subject=SanoVault%20account%20deletion">support@eisenvault.com</a> with the subject “SanoVault account deletion” and your account email. Argali Knowledge Services Private Limited will verify your request. Do not email passwords or medical documents.</p>
    </section>
    <p className="text-sm">Live account data is removed when deletion is accepted. File and authentication-provider cleanup is retried in the background. Offline/exported copies and provider backups are handled as described in our <Link className="text-coral underline" href="/privacy">privacy policy</Link>. A one-way account identifier is retained for up to 180 days, or while authentication cleanup remains pending, to reject old sessions.</p>
  </main></MarketingShell>;
}
