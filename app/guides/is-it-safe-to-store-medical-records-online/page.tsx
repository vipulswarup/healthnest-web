import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { GuideByline, guideDates } from '@/components/marketing/GuideByline';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = 'Is It Safe to Store Medical Records Online? | SanoVault';
const DESCRIPTION =
  "Storing medical records online is convenient but not risk-free. Here is where the risks are, what to ask any app, and how to protect family files.";
const PATH = '/guides/is-it-safe-to-store-medical-records-online';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Is it safe to store medical records online?', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Is it safe to store medical records online?',
    answer: 'It can be reasonably safe if you choose a service carefully and protect your own account, but no online system is risk-free. Most real-world problems come from weak passwords, shared links, public chat groups and lost phones, not from unusual attacks.',
  },
  {
    question: 'Is WhatsApp safe for sharing medical reports?',
    answer: 'WhatsApp is convenient for sending a report to one person, but it is a poor place to keep records: files are hard to find later, copies sit on every recipient’s phone, and a lost or shared phone exposes the chat. Avoid posting reports in large groups.',
  },
  {
    question: 'What is the difference between encrypted and end-to-end encrypted?',
    answer: 'Many services encrypt data while it travels (HTTPS) and while it is stored, but the service itself can still read it in order to run its features. End-to-end encryption means only you and the people you share with can read it. Ask which one a service offers rather than assuming.',
  },
  {
    question: 'What should I check before uploading medical records to an app?',
    answer: 'Check who operates it and how to contact them, where files are stored, who can see them, how sharing links work and expire, whether AI processing is used and whether you can turn it off, and how to delete your data and account.',
  },
  {
    question: 'Which privacy rules apply to my health data?',
    answer: 'Privacy rules depend on where you live and which services you use. Check current official guidance for your location; this guide is not legal advice.',
  },
  {
    question: 'How does SanoVault handle this?',
    answer: 'SanoVault keeps uploaded files in private storage, shows them to people in your family folder, and lets you create time-limited share links for single documents. It is not end-to-end encrypted, it does not claim any certification, and optional AI processing can be turned off. The privacy policy describes this in full.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  type: 'article',
});

export default function SafeOnlineRecordsGuidePage() {
  return (
    <MarketingShell>
      <JsonLd data={articleJsonLd({ headline: 'Is It Safe to Store Medical Records Online?', description: DESCRIPTION, path: PATH, ...guideDates(PATH) })} />
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-coral">Guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Is It Safe to Store Medical Records Online?
          </h1>
          <GuideByline path={PATH} />
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            The honest answer is: it can be, but it depends on where you store them and how you handle your own account. Paper gets lost and burnt. Online storage can be exposed. Neither is automatically safer. This guide shows where the real risks are and gives you a checklist for judging any app or service, including ours.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What &quot;online&quot; usually means</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Most families already store medical files online without calling it that:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Chat apps:</strong> reports arrive and stay in WhatsApp threads.</li>
            <li><strong>Email:</strong> lab PDFs sit in an inbox next to everything else.</li>
            <li><strong>Cloud drives:</strong> a folder on Google Drive, iCloud or similar.</li>
            <li><strong>Hospital and lab portals:</strong> each shows only its own files.</li>
            <li><strong>Health record apps:</strong> a service built to keep records, per person.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Where the real risks are</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Weak or reused passwords,</strong> and no second step at sign-in. This is the most common way accounts are taken over.</li>
            <li><strong>Shared links and group chats.</strong> A link that anyone can open, or a report posted to a big family group, spreads further than you intend, and copies cannot be recalled.</li>
            <li><strong>Lost, shared or unlocked phones.</strong> Reports saved to a camera roll or chat history are visible to whoever holds the phone.</li>
            <li><strong>Public or shared computers.</strong> Files downloaded at a cyber café or hospital desk can be left behind.</li>
            <li><strong>Phishing.</strong> Messages that pretend to be from a lab or hospital and ask you to log in or upload documents.</li>
            <li><strong>Unclear services.</strong> Apps that do not say who runs them, where files go, or how to delete them.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">A checklist for any app or service</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Before you upload anything sensitive, look for clear answers to these:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Who runs it?</strong> A named company with a contact address, not an anonymous app.</li>
            <li><strong>Where are files stored, and who can see them?</strong> Private storage, shown only to the people you choose.</li>
            <li><strong>How does sharing work?</strong> Do links expire? Can you revoke them? Remember that anything a recipient downloads cannot be taken back.</li>
            <li><strong>Is AI used on your files?</strong> If so, what is sent to whom, and can you turn it off?</li>
            <li><strong>What kind of encryption?</strong> Encryption in transit and at rest is common. End-to-end encryption is rarer and means something different. Be wary of claims without detail.</li>
            <li><strong>Can you delete?</strong> A clear way to delete records and your account, and a plain explanation of what remains in backups.</li>
            <li><strong>Is the policy honest about limits?</strong> A policy that promises absolute security is a warning sign. No system can.</li>
          </ol>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What you can do yourself</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>Use a unique password for each service, and turn on a second sign-in step where it is offered.</li>
            <li>Lock your phone, and turn off automatic saving of chat media to the camera roll for threads that carry reports.</li>
            <li>Send a report to the one person who needs it, not to a group.</li>
            <li>Prefer time-limited links over permanent ones, and revoke them when you are done.</li>
            <li>Avoid opening medical files on shared or public computers. If you must, sign out and delete downloads.</li>
            <li>Keep a second copy of important files and the paper originals of major documents. See{' '}
              <Link href="/guides/how-to-organize-medical-records" className="font-medium text-coral hover:underline">
                how to organise medical records
              </Link>
              .
            </li>
            <li>Talk to family members about who can see what, especially for parents&apos; records. See{' '}
              <Link href="/guides/medical-records-for-elderly-parents" className="font-medium text-coral hover:underline">
                medical records for elderly parents
              </Link>
              .
            </li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Check the rules where you live</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Privacy and health-data rules differ by country and can change. Look for the current official guidance in your location, and check what a service says about access, sharing, retention and deletion. This guide is general information, not legal advice.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A service that handles health data should be clear about what it collects and why, ask for consent where required, and explain how to request correction or deletion.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">How SanoVault handles this</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is a{' '}
            <Link href="/personal-health-record-app" className="font-medium text-coral hover:underline">
              personal health record app
            </Link>
            {' '}and its privacy policy tries to describe actual practice, not marketing. In summary:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>Files are kept in private storage and shown to people in your family folder.</li>
            <li>You can create a share link for a single document. Anyone holding the link can open it until it expires or you revoke it, and recipients can download copies.</li>
            <li>Optional AI processing, used to extract fields and summaries, can be switched off in settings.</li>
            <li>It is <strong>not</strong> end-to-end encrypted. See the privacy policy for its data-handling commitments. No system can promise absolute security.</li>
            <li>You can delete patients, families or your account. The policy explains what can remain, such as copies already downloaded and backups until they expire.</li>
          </ul>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Read the full{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">privacy policy</Link>
            {' '}and judge it against the checklist above. SanoVault is built by{' '}
            <Link href="/about" className="font-medium text-coral hover:underline">Argali Knowledge Services Pvt Ltd</Link>
            , the team behind EisenVault.
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>
        </article>
      </main>
    </MarketingShell>
  );
}
