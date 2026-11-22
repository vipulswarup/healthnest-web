import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { GuideByline, guideDates } from '@/components/marketing/GuideByline';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = 'How to Keep Medical Records for Elderly Parents | SanoVault';
const DESCRIPTION =
  "A practical guide for adult children managing an ageing parent's medical records: what to gather, medicine lists, family communication and consent.";
const PATH = '/guides/medical-records-for-elderly-parents';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Medical records for elderly parents', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Where do I start with my parent’s medical records?',
    answer: 'Start with a current medicine list and the most recent discharge summary or specialist letter. Then gather the last two years of lab and imaging reports. Older papers can be added gradually.',
  },
  {
    question: 'Do I need my parent’s permission?',
    answer: 'Where your parent can decide for themselves, ask them first and involve them in what is kept and who can see it. Medical papers are sensitive personal information. If your parent cannot decide, the position depends on your situation and local rules, so consider taking advice. This guide is not legal advice.',
  },
  {
    question: 'How do I keep siblings informed without sharing everything?',
    answer: 'Agree who holds the main folder, and share only what each person needs: a current medicine list and the latest key reports are often enough. Avoid forwarding full sets in large family chat groups.',
  },
  {
    question: 'What should I carry to a hospital visit with my parent?',
    answer: 'A current medicine list with doses, recent relevant lab and imaging reports, the latest discharge summary, a short note of long-term conditions and past surgeries, and any known allergies, if they are documented.',
  },
  {
    question: 'Can I keep my parent’s records in SanoVault?',
    answer: 'Yes. You can keep records for yourself, children and parents in one family folder and invite only the people who should see it. SanoVault does not give medical advice and does not fetch records from hospital portals; you upload the files you have.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  type: 'article',
});

export default function ElderlyParentsRecordsGuidePage() {
  return (
    <MarketingShell>
      <JsonLd data={articleJsonLd({ headline: 'How to Keep Medical Records for Elderly Parents', description: DESCRIPTION, path: PATH, ...guideDates(PATH) })} />
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-coral">Guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            How to Keep Medical Records for Elderly Parents
          </h1>
          <GuideByline path={PATH} />
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            If you help look after an ageing parent, you are probably the one hunting for last year&apos;s report in a drawer, a WhatsApp chat, or a relative&apos;s phone. This guide is a calm, practical way to put those papers in order, so that a hospital visit or a second opinion does not start with a scramble.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Start with the conversation, not the paperwork</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Medical papers are private. Before you gather anything, talk to your parent about what you are doing and why: so that a doctor can see the full picture quickly, and so that a family member can help in an emergency. Ask what they are comfortable with, and who else should be able to see the papers. Taking over their files without asking can feel like losing independence.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            If your parent can no longer decide for themselves, the right approach depends on your situation and on local rules about who may act for them. Consider taking advice. This guide is not legal advice.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Gather in this order</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>A current medicine list.</strong> Every medicine, the dose, when it is taken, and why if known. Include things bought without a fresh prescription if they are taken regularly.</li>
            <li><strong>The latest discharge summary or specialist letter.</strong> These explain what was found and what was advised.</li>
            <li><strong>Recent lab and imaging reports.</strong> The last two years is a good first target.</li>
            <li><strong>Long-term condition papers.</strong> For example, diabetes, blood pressure, heart or kidney records, in date order.</li>
            <li><strong>Allergy information and vaccination records,</strong> if they are written down anywhere.</li>
            <li><strong>Older papers.</strong> Add these gradually. You do not need a perfect archive in a weekend.</li>
          </ol>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Look in the places records collect: the almirah, old handbags, email, and the chats where labs and clinics send PDFs. For paper you want to digitise, see{' '}
            <Link href="/guides/scan-old-medical-reports" className="font-medium text-coral hover:underline">
              how to scan old paper medical reports
            </Link>
            .
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Keep one current medicine list</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            For an older person, this single page is often the most useful document. It is what a new clinic or an emergency team asks for first. Update it whenever a doctor starts, stops or changes a medicine, and put the date on it. If several doctors are involved, make sure the list reflects all of them. Showing the list to each doctor at each visit is more reliable than assuming they can see each other&apos;s notes.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Organise by date and by condition</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Keep your parent&apos;s files separate from everyone else&apos;s, in date order. Within that, a simple label for the condition or specialty (for example &quot;heart&quot;, &quot;eyes&quot; or &quot;diabetes&quot;) helps when you need only those papers. A name such as <span className="font-mono text-sm">2025-02-14-appa-cardiology-letter.pdf</span> is easier to find than a photo named by the phone. More in{' '}
            <Link href="/guides/how-to-organize-medical-records" className="font-medium text-coral hover:underline">
              how to organise medical records
            </Link>
            .
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Share with siblings without oversharing</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            When several children are involved, confusion usually comes from everyone holding a different partial set. Agree on one person who keeps the main folder and one place it lives. Then share only what each person needs:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>A sibling travelling to the hospital needs the current medicine list and the latest key reports.</li>
            <li>A relative who just wants to stay informed may not need the files at all.</li>
            <li>Avoid posting full reports to large family chat groups, where they are hard to retrieve and easy to forward.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Prepare for a hospital visit or emergency</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Keep a small, ready set that you can open on a phone or print:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>The current medicine list with doses</li>
            <li>The last discharge summary</li>
            <li>Recent relevant lab and imaging reports</li>
            <li>A short note of long-term conditions and past surgeries, if you have it in writing</li>
            <li>Known allergies, if documented</li>
            <li>The name and number of the regular doctor, and of the family contact</li>
          </ul>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A thin, dated set is more useful to a clinician than a bag of unsorted papers.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Back up and protect the files</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Keep the originals of discharge summaries and major imaging reports, plus a second digital copy on a device or drive you control. Lock the phone or computer that holds the files, and know who can open any cloud account you use. Privacy rules depend on where you live and which services you use; treat a parent&apos;s health files as confidential and share them only with their knowledge.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Where a family health record app helps</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Folders work for one person. When you are also keeping a child&apos;s records, or a sibling in another city needs access, an app can help. A{' '}
            <Link href="/family-health-records" className="font-medium text-coral hover:underline">
              family health record
            </Link>{' '}
            keeps each person&apos;s files separate, keeps their medicines beside them, and lets you invite only the people who should see that folder.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is one such folder for families. You upload what you have, file it against your parent&apos;s profile, and can send a time-limited link for one document when a clinic asks for it. It does not fetch records from hospital portals or give medical advice. Read how{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">records are handled</Link>
            {' '}before you upload.
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>
        </article>
      </main>
    </MarketingShell>
  );
}
