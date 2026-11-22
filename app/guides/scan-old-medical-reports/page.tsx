import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { GuideByline, guideDates } from '@/components/marketing/GuideByline';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = 'How to Scan Old Paper Medical Reports at Home | SanoVault';
const DESCRIPTION =
  "A step-by-step guide to digitising old paper medical reports with your phone: what to scan first, how to name files, and what to do with originals.";
const PATH = '/guides/scan-old-medical-reports';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Scan old medical reports', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Can I scan medical reports with my phone?',
    answer: 'Yes. A phone camera is enough if the page is flat, well lit, and every line of text is readable. A document-scanner mode, where your phone has one, usually gives a cleaner result than a plain photo.',
  },
  {
    question: 'PDF or photo: which is better?',
    answer: 'A multi-page PDF is easier to store and share because the pages stay together. Single photos are fine for one-page reports. Either way, the date, the name and the letterhead must be visible.',
  },
  {
    question: 'Should I throw away the paper after scanning?',
    answer: 'Keep the originals of discharge summaries, major imaging reports and anything you may need for insurance or legal reasons. Duplicate prints and billing-only receipts are usually safe to discard once you have a readable scan. When in doubt, keep the paper.',
  },
  {
    question: 'What should I scan first?',
    answer: 'Start with the last two years of records and anything from a hospital stay: discharge summaries, operation notes, imaging reports and recent lab results. Older and minor papers can wait.',
  },
  {
    question: 'Are free scanning apps safe for medical records?',
    answer: 'It depends on the app. Medical papers are sensitive, so check where scans are stored and who can see them before using one. The phone’s built-in camera and notes or files app keeps scans on your own device.',
  },
  {
    question: 'Can SanoVault read scanned reports?',
    answer: 'You can upload PDFs and photos, or scan with your phone camera, and file them against the right person. SanoVault does not give medical advice and does not fetch records from hospital portals.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  type: 'article',
});

export default function ScanOldReportsGuidePage() {
  return (
    <MarketingShell>
      <JsonLd data={articleJsonLd({ headline: 'How to Scan Old Paper Medical Reports at Home', description: DESCRIPTION, path: PATH, ...guideDates(PATH) })} />
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-coral">Guide</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            How to Scan Old Paper Medical Reports at Home
          </h1>
          <GuideByline path={PATH} />
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            Years of prescriptions, lab printouts and discharge papers are easy to lose and hard to search. You do not need a flatbed scanner to fix that. A phone, decent light and a plan are enough. This guide covers what to scan first, how to get a readable copy, and what to do with the paper afterwards.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Decide what is worth scanning</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            You do not have to digitise everything. Prioritise what another doctor is likely to ask for, or what you would regret losing:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li>Discharge summaries and operation notes</li>
            <li>Imaging reports (X-ray, ultrasound, CT, MRI)</li>
            <li>Lab reports for long-running conditions, such as thyroid, sugar, kidney or cholesterol</li>
            <li>Prescriptions that explain a long-term medicine</li>
            <li>Vaccination cards and booklets</li>
          </ul>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Start with the last two years and any hospital stay. Billing-only receipts and duplicate prints can usually wait or be discarded. For a fuller list, see{' '}
            <Link href="/guides/how-to-organize-medical-records" className="font-medium text-coral hover:underline">
              how to organise medical records
            </Link>
            .
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Set up before you start</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Sort by person first.</strong> Make one pile per family member so you never mix two people&apos;s reports.</li>
            <li><strong>Sort by date within each pile.</strong> Oldest to newest, or the reverse. Pick one and keep to it.</li>
            <li><strong>Remove staples and clips.</strong> Pages lie flatter and you will not miss a back page.</li>
            <li><strong>Find a plain, dark, flat surface.</strong> A table near a window works better than a bed.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Get a readable scan with a phone</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Use daylight or an even light.</strong> Avoid a bright bulb directly overhead, which causes glare on glossy paper.</li>
            <li><strong>Avoid your own shadow.</strong> Hold the phone straight above the page, not at an angle.</li>
            <li><strong>Fill the frame.</strong> Include all four edges so the page is not cropped, but not a wide view of the table.</li>
            <li><strong>Use a scanner mode if your phone has one.</strong> It flattens the page and brightens text. Many phones have one in the camera, the notes app or the files app.</li>
            <li><strong>Check each page before moving on.</strong> Zoom in and read a line of small text. If you cannot read it, retake it.</li>
            <li><strong>Do not cover the header.</strong> The date, the patient name, the laboratory or hospital name and the letterhead are what make the page useful later.</li>
          </ol>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Handle tricky papers</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Faded thermal printouts:</strong> scan these first. They fade quickly, and the text may be unreadable in a few years.</li>
            <li><strong>Handwritten prescriptions:</strong> take the photo in good light and do not crop the date. Handwriting that is hard to read now will not get easier later.</li>
            <li><strong>Folded or large pages:</strong> flatten as best you can and scan in two overlapping halves if needed.</li>
            <li><strong>Films and CDs:</strong> you cannot scan these into a useful image with a phone. Keep them, scan the written report, and note where the images are kept.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">PDF or photo?</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            For a report with several pages, combine the pages into one PDF so they stay in order. For a single page, one photo is fine. Either way, keep the original image quality: very heavy compression can make small numbers unreadable.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Name the file so you can find it</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A name that sorts well looks like this:
          </p>
          <p className="mt-3 rounded-xl border border-silver bg-background px-4 py-3 font-mono text-sm text-ink">
            2023-03-05-ravi-discharge-city-hospital.pdf
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Use year-month-day first, then the person, then the type and source. If a page has no date, use the month you received it. Avoid names like &quot;IMG_4821.jpg&quot;.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What to do with the paper afterwards</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-blue-slate">
            <li><strong>Keep:</strong> discharge summaries, major imaging reports, and anything that matters for insurance or legal reasons.</li>
            <li><strong>Usually safe to discard:</strong> duplicate prints, receipts with no clinical detail, and minor one-off slips, once the scan is readable and backed up.</li>
            <li><strong>Store what you keep:</strong> one labelled envelope or folder per person, in a dry place.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Back up and protect the scans</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Phones break and get replaced. Keep a second copy of important scans on a computer or drive you control. Medical documents are sensitive, so lock your phone, avoid sharing reports in large chat groups, and know who can open any cloud account you use. Privacy rules depend on where you live and which services you use. This guide is not legal advice; treat health files as confidential.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Keep the scans organised, not just saved</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A folder of scans helps, but it gets hard to search once there are dozens. A{' '}
            <Link href="/personal-health-record-app" className="font-medium text-coral hover:underline">
              personal health record app
            </Link>{' '}
            can hold the files against each person, keep a current medicine list beside them, and help you put together a short set before a visit.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is one such folder for families. You upload PDFs and photos, or scan with your phone camera, and file them per person, including papers that never entered any hospital system. It does not fetch records from hospital portals or give medical advice. Read how{' '}
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
