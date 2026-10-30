import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta, MarketingShell } from '@/components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = 'Personal Health Record App for Indian Families | SanoVault';
const DESCRIPTION =
  'A personal health record is a health history you keep yourself. SanoVault helps Indian families organise lab reports, prescriptions, scans and medicines from different hospitals — including records that are not in one hospital system.';
const PATH = '/personal-health-record-app-india';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Personal health record', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'What is a PHR app?',
    answer: 'A personal health record app is software that lets you store and organise your own medical documents and history, instead of relying only on a hospital or clinic system.',
  },
  {
    question: 'Is a personal health record the same as a hospital record?',
    answer: 'No. A hospital record is what that hospital keeps. A personal health record is the set of documents and notes you keep yourself, which can include files from many hospitals, labs and doctors.',
  },
  {
    question: 'Can SanoVault replace ABHA?',
    answer: 'No. ABHA is India\'s national health ID under ABDM. SanoVault does not fetch records from ABHA, and it is not a replacement for it. You can optionally save an ABHA number on a person\'s profile for your own reference.',
  },
  {
    question: 'Can I store records from more than one hospital?',
    answer: 'Yes. You upload the files you have, whoever issued them. SanoVault is not tied to one hospital or portal.',
  },
  {
    question: 'Can I add old PDFs and paper reports?',
    answer: 'Yes. Upload PDFs and photos, or scan paper with your phone camera. That includes files you received on email or WhatsApp and saved on your phone.',
  },
  {
    question: 'Who can see the records?',
    answer: 'People in your family folder, and anyone you send a time-limited link for a specific document. SanoVault does not publish a public health profile.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function PersonalHealthRecordPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Your Personal Health Record, All in One Place
          </h1>
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            SanoVault is a personal health record app for people and families in India. It helps you keep medical documents from different doctors, hospitals and labs together, including older files that may never appear in one hospital system.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">What is a personal health record?</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A personal health record (PHR) is a health history you maintain yourself. It can include laboratory reports, prescriptions, imaging reports, discharge summaries, vaccination notes and a current medicine list.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            The point is not to replace your doctor. It is to have a usable copy of information that otherwise sits in several places, so you can find it when a clinic asks for last year&apos;s reports.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Why health records become fragmented</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Care in India often involves more than one hospital, a neighbourhood clinic, a diagnostic laboratory, and an imaging centre. Reports arrive as printouts, PDFs, WhatsApp images and email attachments. Hospital apps and portals usually show only what that institution holds.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Older paper files may never have been scanned. A new specialist then has to reconstruct history from whatever you can find that week. That is a records problem, not a medical-advice problem.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A practical walkthrough of paper, PDFs and naming is in the{' '}
            <Link href="/guides/how-to-organize-medical-records" className="font-medium text-coral hover:underline">
              guide to organising medical records
            </Link>.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Hospital records vs a record you control</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A hospital record belongs to that hospital&apos;s system. It is useful, and it may be incomplete for your whole life: a different city, a different lab, a paper prescription from years ago, or a scan done elsewhere will often not be there.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            A patient-controlled health record is the set of documents you choose to keep. You decide what goes in. SanoVault is that kind of folder: you upload and file records; it does not pull files from hospital portals on its own.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Why a longitudinal history is useful</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Doctors often ask what was done before: previous labs, imaging, surgeries, allergies, and medicines. Having those documents in date order, for one person, saves time at the appointment. It also helps when you want a second opinion and need to show the same file set twice.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault does not interpret those records as a diagnosis. Summaries and extracted text are for your filing, not a substitute for a clinician.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Types of records you can keep</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            In SanoVault you can upload PDFs, photos and office files, and scan paper with your phone. Records can be filed as lab reports, prescriptions, consultation notes, imaging reports, discharge summaries, vaccination records, vitals, identity documents, or other.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Beside the documents, you can keep a medicine list, log blood pressure, record vaccinations, and keep visit notes. After linking a WhatsApp number, you can forward a report to SanoVault and choose who it belongs to.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Family health records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            The same folder can hold more than one person — you, children, or parents you are helping. Household members you invite can see the people and records in that folder. That is{' '}
            <Link href="/family-health-records" className="font-medium text-coral hover:underline">
              family health records in one household folder
            </Link>, with access only for people you add.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Using old medical records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Old reports still matter: a surgery from a decade ago, a childhood vaccination card, or a lab trend that started years back. Photograph or scan the page, upload the PDF, and file it against the right person with a date if you know it.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            You do not need a perfect archive on day one. Start with the documents you already hunt for before appointments.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Using records at a doctor visit</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Before a visit, open that person&apos;s timeline and pick the recent labs, relevant imaging, and current medicines. SanoVault can print a medicine list and a one-page summary of labs, blood pressure and medicines to take along. If a clinician needs one file, you can send a time-limited link for that document.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">How SanoVault relates to ABHA</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            ABHA (Ayushman Bharat Health Account) is a health ID issued under the{' '}
            <a href="https://abdm.gov.in/" className="font-medium text-coral hover:underline" rel="noopener noreferrer">
              Ayushman Bharat Digital Mission (ABDM)
            </a>
            , the Government of India&apos;s digital health programme. You can create and manage an ABHA number on the{' '}
            <a href="https://abha.abdm.gov.in/" className="font-medium text-coral hover:underline" rel="noopener noreferrer">
              official ABHA portal
            </a>.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is not an ABHA application. It does not currently connect to ABDM to fetch or send health records. You can optionally store an ABHA number on a person&apos;s profile for your own reference. Many older reports, private clinic notes, and files sitting on a phone will still need to be kept by you, whether or not they ever appear in an ABHA-linked view.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Privacy and who can see your folder</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Uploaded files are kept in private storage. They are shown to people in your folder, unless you create a share link for a specific document. Share links can expire and can be revoked. There is no public health profile.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault is in beta and is not certified under HIPAA, GDPR, or India&apos;s DPDP Act. Read{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">
              how records are handled
            </Link>
            {' '}before you decide what to store.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">How SanoVault works</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-7 text-blue-slate">
            <li>Create a folder and add the people whose records you are keeping.</li>
            <li>Upload or scan reports, and keep a medicine list up to date.</li>
            <li>Find a person&apos;s history when you need it, print a short clinic set, or share one document for a limited time.</li>
          </ol>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            The product is free during the beta. AI extraction and summaries may become paid later.{' '}
            <Link href="/pricing" className="font-medium text-coral hover:underline">See pricing</Link>.
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>
        </article>
      </main>

      <MarketingCta
        heading="Start a personal health record"
        body="Create a SanoVault folder and add the reports you already have — from any hospital, lab or clinic."
      />
    </MarketingShell>
  );
}
