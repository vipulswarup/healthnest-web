import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta, MarketingShell } from '@/components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = 'How to Organize Your Medical Records: A Practical Guide | SanoVault';
const DESCRIPTION =
  'A practical guide to organising medical records in India — which papers to keep, how to digitise old reports, name files, back them up, and prepare a concise set before a doctor visit.';
const PATH = '/guides/how-to-organize-medical-records';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'How to organize medical records', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Which medical records should I keep?',
    answer: 'Keep discharge summaries, major imaging, laboratory results you may need again, current and past prescriptions that explain long-term medicines, vaccination records, and a current medicine list. You do not need every receipt or every minor clinic slip forever.',
  },
  {
    question: 'How should I name medical report files?',
    answer: 'Use a date first, then the person, then the type and source — for example 2024-08-12-ananya-lab-thyrocare.pdf. Dates in year-month-day order sort correctly on a computer.',
  },
  {
    question: 'Is it safe to keep medical records on WhatsApp?',
    answer: 'WhatsApp is a common way reports arrive, but it is a poor archive: chats are hard to search, easy to lose when a phone is replaced, and mixed with unrelated messages. Save important files out of the chat into a folder you control, or into a personal health record.',
  },
  {
    question: 'How do I prepare records for a new doctor?',
    answer: 'Take a current medicine list, recent relevant labs, key imaging or discharge papers, and a short note of major diagnoses or surgeries. A thick unsorted stack is less useful than a small, dated set.',
  },
  {
    question: 'Do I need a personal health record app?',
    answer: 'No. A dated folder on a drive, plus paper backups of the most important documents, works. An app reduces renaming, searching and sharing work once the volume grows, especially across a family.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function OrganizeMedicalRecordsGuidePage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-coral">Guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            How to Organize Your Medical Records
          </h1>
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            This is a practical way to keep medical records you can actually find — on paper, on a computer, or in an app. You do not need special software to follow it. The aim is a dated, named set of documents for each person, not a perfect archive of every slip.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Why medical records become scattered</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Reports arrive from hospitals, clinics, laboratories and imaging centres. Some are printed. Some are PDFs on email. Some are photographs on WhatsApp. Each portal, if there is one, usually shows only that institution&apos;s files. After a few years the trail is a drawer, a phone, and a forgotten drive.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Organising records does not replace medical care. It only makes the documents easier to hand over when a clinician asks for them.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Which medical records are worth keeping</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Keep what another doctor is likely to ask for, or what you would regret losing:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>Discharge summaries and operation notes</li>
            <li>Imaging reports (and films or CDs if they still matter)</li>
            <li>Laboratory reports, especially ones that form a trend</li>
            <li>Current prescriptions and any that explain long-term medicines</li>
            <li>Vaccination records</li>
            <li>Allergy information and major diagnosis letters, if you have them</li>
            <li>A simple, current medicine list</li>
          </ul>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            You can usually discard duplicate prints, billing-only receipts, and one-off slips that add no clinical detail — unless you need them for insurance. When in doubt, keep the report, not the envelope.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Old paper records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Photograph or scan pages in good light, one page at a time, without covering the date or the letterhead. A phone camera is enough if the text is readable. Keep the original of discharge summaries and major imaging reports in a labelled envelope even after you digitise them.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            You do not have to digitise a lifetime in one weekend. Start with the last two years and anything that involved a hospital stay.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Prescriptions</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Save prescriptions that show what was started, stopped, or changed. A photo of a handwritten note is better than nothing if the ink is still readable. Pair prescriptions with a separate medicine list you update when a drug changes, so you are not reconstructing doses from old slips in the waiting room.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Lab reports</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Prefer the PDF from the laboratory when you have it; photographs of printouts work if that is all you received. Keep the collection date in the file name. For long-running tests (for example thyroid, sugar, kidney, cholesterol), keeping the sequence matters more than keeping every minor variation of the same printout.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Imaging reports</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Store the written report with a date and the body area or scan type in the name. Keep films, CDs or hospital viewer links if the next doctor may need the images, not only the text. Note where the images live (CD, hospital, email) if you cannot store the image files themselves.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Discharge summaries</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            These are among the most useful documents you can keep. They usually list why the person was admitted, what was done, and what medicines were advised at discharge. File one copy digitally and keep the paper with other hospital documents for that person.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Vaccination information</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Photograph the card or booklet, and write down vaccine name, dose and date in a list you can update. School, travel and paediatric visits still ask for this. If you are unsure which adult vaccines someone has had, do not guess — keep what is documented and let a clinician interpret gaps.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Medicine lists</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Maintain one current list per person: medicine name, dose, when it is taken, and why if you know. Include medicines bought without a fresh prescription if they are taken regularly. Update the list when something is stopped. This single page is often more useful at a new clinic than a bundle of old bills.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Group records by date</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Chronological order answers the question clinicians actually ask: what happened last, and what came before. Within one person, sort by date of the report (or the visit), newest or oldest — pick one and stay with it. A timeline beats folders named “misc” and “new new final”.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Organise by family member</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Do not mix two people&apos;s labs in one pile. Use one envelope, one computer folder, or one profile per person. That is the core of{' '}
            <Link href="/family-health-records" className="font-medium text-coral hover:underline">
              keeping family medical records together
            </Link>
            {' '}without losing track of whose file is whose. Only share a household archive with people who should see everyone in it.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Sensible file names</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            If you store files yourself, a name that sorts well looks like this:
          </p>
          <p className="mt-3 rounded-xl border border-silver bg-background px-4 py-3 font-mono text-sm text-ink">
            2024-08-12-priya-lab-thyrocare.pdf
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Use year-month-day first, then the person&apos;s name, then the type (lab, rx, discharge, xray) and the source. Avoid “scan1.jpg” and “report final(2).pdf”. If a report has no date, use an approximate month or the day you received it, and say so in the name if you must.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Back up important records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Phones break and WhatsApp chats disappear when a number changes. Keep a second copy of discharge summaries, major imaging and the current medicine list — for example a folder on a computer plus the paper originals of the most important documents. If you use cloud storage, know who else can open that account.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Privacy when you store health files</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Medical documents are sensitive. Prefer storage you control. Do not post reports in large family groups. Lock the phone and computer you use. If you share a file with a clinic, send only what they need, and avoid leaving copies on shop or hospital public computers.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            India&apos;s Digital Personal Data Protection Act (DPDP) governs personal data in many contexts; this guide is not legal advice. Treat health files as confidential regardless of which tool you use.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What to take to a doctor visit</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A concise set usually beats a suitcase:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>Current medicine list</li>
            <li>Recent labs that relate to this visit</li>
            <li>The latest relevant imaging report</li>
            <li>The last discharge summary if the problem started in hospital</li>
            <li>A short list of major past surgeries or long-term diagnoses, if you have it in writing</li>
          </ul>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            If you are seeking a second opinion, take the same packet so both clinicians see the same source documents.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">When a personal health record app helps</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Folders and paper work until the volume grows, several people are involved, or you need a medicine list and last month&apos;s PDF on a clinic morning. A{' '}
            <Link href="/personal-health-record-app-india" className="font-medium text-coral hover:underline">
              personal health record app
            </Link>
            {' '}can store uploads against each person, keep medicines beside the files, and produce a short set for a visit.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is one such folder for Indian families: you upload or scan reports, file them per person, and share a specific document only when you choose. It does not fetch records from ABHA or from hospital portals. It does not give medical advice. If you use it, read how{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">records are handled</Link>
            {' '}first.
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>
        </article>
      </main>

      <MarketingCta
        heading="Keep records where you can find them"
        body="If you want less renaming and searching, you can file reports in a SanoVault folder — or keep using dated files. Either is better than leaving everything in chat."
      />
    </MarketingShell>
  );
}
