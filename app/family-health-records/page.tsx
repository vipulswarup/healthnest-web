import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/marketing/Breadcrumbs';
import { FaqSection } from '@/components/marketing/FaqSection';
import { JsonLd } from '@/components/marketing/JsonLd';
import { MarketingCta, MarketingShell } from '@/components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd, publicPageMetadata, type BreadcrumbItem, type FaqItem } from '@/lib/seo';

const TITLE = "Family Health Records App | Keep Your Family's Medical History Together";
const DESCRIPTION =
  "Keep medical records for yourself, your children, and ageing parents in one family folder. Organise reports, medicines and history from different doctors, with access only for people you invite.";
const PATH = '/family-health-records';

const CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', path: '/' },
  { name: 'Family health records', path: PATH },
];

const FAQS: FaqItem[] = [
  {
    question: 'Can I keep medical records for my parents and children in one app?',
    answer: 'Yes. SanoVault uses a family folder. You add a person for each family member whose records you are keeping, and file reports against that person.',
  },
  {
    question: 'Who can see a family folder?',
    answer: 'Adults you invite as members of that household. Members can see the people and records in the folder. Invite only people who should have that access.',
  },
  {
    question: 'Does adding a parent mean I control their healthcare?',
    answer: 'No. SanoVault is a place to keep documents. Adding someone\'s records is for organising information you already handle with them — not a medical power of attorney, and not a way to collect records without their knowledge.',
  },
  {
    question: 'Can each person have records from different doctors?',
    answer: 'Yes. File whatever reports you have for that person, from any hospital, clinic or lab.',
  },
  {
    question: 'Can we keep a medicine list for each person?',
    answer: 'Yes. Each person can have a medicine list you can print for a clinic visit, along with their uploaded reports.',
  },
  {
    question: 'Is this connected to ABHA?',
    answer: 'No. SanoVault does not fetch family records from ABHA. You can optionally save an ABHA number on a person\'s profile. The files in the folder are ones you add.',
  },
];

export const metadata: Metadata = publicPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function FamilyHealthRecordsPage() {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbJsonLd(CRUMBS)} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs items={CRUMBS} />
          <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            One Place for Your Family&apos;s Health Records
          </h1>
          <p className="mt-4 text-lg leading-7 text-blue-slate">
            Indian households often hold records for more than one person: a child&apos;s labs, a parent&apos;s discharge summary, your own prescriptions. SanoVault is a family folder for that history — not a hospital login, and not a substitute for the people whose care it is.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">A household folder, not a shared public profile</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            In SanoVault, a household is a private folder. You add people (profiles) whose records belong there, and you can invite other adults to join that folder. Everyone in the folder can see the people and records linked to it. Invite only those who should.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            There is no public family health page. If someone needs one document, you can send a time-limited link for that file.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Your own records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Start with yourself. Upload reports from different doctors and labs, keep a medicine list, and log blood pressure if you track it. That{' '}
            <Link href="/personal-health-record-app-india" className="font-medium text-coral hover:underline">
              personal health record
            </Link>
            {' '}sits in the same household as everyone else you add, so you are not maintaining five separate logins for one family.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Children&apos;s records</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Paediatric visits accumulate vaccination notes, growth measurements, prescriptions and lab work. Filing those against the child — rather than mixing them into a parent&apos;s chat backup — makes the next school form or clinic visit simpler.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault can store vaccination records and growth (height and weight) you enter, alongside uploaded reports.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Helping ageing parents</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Many adults help a parent keep track of reports, medicines and appointments. That help works better when it is done with the parent, not around them. Use SanoVault when you are already trusted to handle those papers — and invite the parent (or another sibling) into the folder when they should see it too.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            This is not a claim that adult children control a parent&apos;s healthcare. It is a filing system for documents a household is already managing together.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Records from different doctors</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            One person may see a GP, a specialist, and a hospital in another city. SanoVault does not merge those institutions. You keep a copy of what you were given, tagged to that person, so the next clinician is not starting from an empty table.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Historical reports</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Old discharge summaries, imaging, and lab PDFs are worth keeping even if the letterhead is from a hospital you no longer visit. Scan paper, upload the PDF, and put a date on the record if you know it. A longer walkthrough is in{' '}
            <Link href="/guides/how-to-organize-medical-records" className="font-medium text-coral hover:underline">
              how to organise medical records
            </Link>.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Medicines for each person</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Each person can have a medicine list. You can print a clinic-ready list instead of reciting names from memory or from a photograph of a strip. Keep the list next to the prescriptions and lab reports that belong to the same person.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Preparing for an appointment</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Before a visit, open that person in the folder. Pull recent labs, the current medicines, and any discharge or imaging the new doctor is likely to ask for. You can print a medicine list and a one-page summary of labs, blood pressure and medicines. If the clinic only needs one report, share that file with a link that expires.
          </p>

          <h2 className="mt-12 text-2xl font-bold tracking-tight">Access and consent</h2>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            SanoVault does not offer a separate permission for every document. Access is at household level: members of the folder see the records in it. That is why invitations matter. Do not add a relative&apos;s files unless they expect you to keep them, and do not invite someone who should not see the whole folder.
          </p>
          <p className="mt-3 text-base leading-7 text-blue-slate">
            Details of storage and sharing are on the{' '}
            <Link href="/privacy" className="font-medium text-coral hover:underline">privacy page</Link>.
            The product is in beta and is not certified under HIPAA, GDPR, or India&apos;s DPDP Act.
          </p>

          <div className="mt-12">
            <FaqSection items={FAQS} />
          </div>
        </article>
      </main>

      <MarketingCta
        heading="Put the family folder in one place"
        body="Create a household, add the people whose records you keep, and invite only those who should see them."
      />
    </MarketingShell>
  );
}
