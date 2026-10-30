import Link from "next/link";
import { BETA_ACKNOWLEDGEMENT_TEXT } from "@/lib/legal/beta-acknowledgement";
import { faqJsonLd, type FaqItem } from "@/lib/seo";
import {
  CANONICAL_SITE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";
import { FaqSection } from "@/components/marketing/FaqSection";
import { JsonLd } from "@/components/marketing/JsonLd";
import {
  MarketingCta,
  MarketingShell,
} from "@/components/marketing/MarketingShell";

const RECORD_TYPES = [
  {
    title: "Lab reports",
    description:
      "Blood tests, pathology PDFs, and other laboratory results, filed against the right person.",
  },
  {
    title: "Prescriptions",
    description:
      "Photos or scans of clinic prescriptions, kept with the rest of that person's history.",
  },
  {
    title: "Imaging reports",
    description:
      "X-ray, ultrasound, CT, MRI and other scan reports you upload.",
  },
  {
    title: "Discharge summaries",
    description:
      "Hospital discharge papers from different admissions, in one timeline.",
  },
  {
    title: "Vaccination records",
    description: "Doses you record, with due dates when you add them.",
  },
  {
    title: "Medicines and vitals",
    description:
      "A medicine list you can print, plus blood pressure and growth you log yourself.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Create a folder",
    description:
      "Sign in with Google or an email link and add the people in your household.",
  },
  {
    step: "2",
    title: "Add the records you have",
    description:
      "Upload PDFs and photos, or scan paper with your phone. After linking a number, you can also forward files to SanoVault on WhatsApp.",
  },
  {
    step: "3",
    title: "Use them when you need them",
    description:
      "Open the history, print a medicine list or a one-page doctor summary, or send a link that expires on its own.",
  },
] as const;

const HOME_FAQS: FaqItem[] = [
  {
    question: "What is a personal health record?",
    answer:
      "A personal health record (PHR) is a health history you keep yourself. It can include reports, prescriptions and notes from different doctors, hospitals and labs — not only what one hospital system stores.",
  },
  {
    question: "Can I keep medical records for my family?",
    answer:
      "Yes. SanoVault uses a family folder. You can add people in your household and invite other adults to that folder. Members can see the people and records in it, so invite only those who should have access.",
  },
  {
    question: "Can I upload old medical reports?",
    answer:
      "Yes. You can upload PDFs and photos, and scan paper reports with your phone camera. That includes older files you already have on your phone or computer.",
  },
  {
    question: "Can I keep records from different hospitals?",
    answer:
      "Yes. SanoVault is not tied to one hospital. You add the reports you have, whoever issued them.",
  },
  {
    question: "Can I share a record with a doctor?",
    answer:
      "You can send a time-limited link for a specific document, or take a one-page summary and a medicine list to the appointment. There is no public profile.",
  },
  {
    question: "Is SanoVault connected to ABHA?",
    answer:
      "No. SanoVault does not currently fetch records from ABHA or ABDM. You can optionally save an ABHA number on a person's profile. Records in SanoVault are ones you add yourself. ABHA is India's health ID under the Ayushman Bharat Digital Mission; not every past report will be available there.",
  },
  {
    question: "What kinds of medical documents can I store?",
    answer:
      "Lab reports, prescriptions, imaging reports, discharge summaries, vaccination records, and other files you upload. You can also keep a medicine list and log blood pressure.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: CANONICAL_SITE_URL,
      logo: `${CANONICAL_SITE_URL}/logo.png`,
    },
  ],
};

export function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd(HOME_FAQS)} />

      <main>
        <section className="bg-gradient-to-br from-sage/25 via-cream to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate">
                Personal health record for Indian families
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                {SITE_TAGLINE}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-7 text-blue-slate">
                Keep lab reports, prescriptions and old papers from different
                doctors, hospitals and labs together — including records that
                are not in one hospital system.
              </p>
              <p className="mt-3 text-sm font-medium text-ink">
                Free to use right now.{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-ink underline decoration-sage decoration-2 underline-offset-4 hover:text-slate"
                >
                  See pricing
                </Link>
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/signup" className="sv-btn sv-btn-primary">
                  Create a folder
                </Link>
                <Link href="/auth/signin" className="sv-btn sv-btn-outline">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="relative" aria-hidden="true">
              <div className="rounded-2xl border border-sage/70 bg-white p-5 shadow-sm shadow-ink/5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  This week
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="rounded-xl border border-silver/80 bg-cream px-4 py-3">
                    <p className="text-sm font-semibold text-ink">Lab report</p>
                    <p className="mt-0.5 text-sm text-blue-slate">
                      Filed for the household, ready to open
                    </p>
                  </li>
                  <li className="rounded-xl border border-silver/80 bg-cream px-4 py-3">
                    <p className="text-sm font-semibold text-ink">
                      Medicine list
                    </p>
                    <p className="mt-0.5 text-sm text-blue-slate">
                      Printable for the next clinic visit
                    </p>
                  </li>
                  <li className="rounded-xl border border-sage/60 bg-sage/15 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">
                      For the doctor
                    </p>
                    <p className="mt-0.5 text-sm text-blue-slate">
                      One-page summary of labs, BP, and medicines
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          className="border-t border-silver/70"
          aria-labelledby="problem-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="problem-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Health records rarely live in one place
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-slate">
              A person&apos;s medical information in India is often spread
              across hospitals, clinics, laboratories, PDFs, paper
              prescriptions, email, WhatsApp, and different portals. Older
              reports may never have been digitised. There is often no single
              longitudinal view of that history.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Hospital files and discharge papers",
                "Clinic prescriptions",
                "Laboratory PDFs",
                "Imaging reports",
                "WhatsApp photos and files",
                "Email attachments",
                "Paper files at home",
                "Different hospital portals",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-silver bg-white px-4 py-3 text-sm text-blue-slate"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-silver/70 bg-background"
          aria-labelledby="solution-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="solution-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              One organised personal health record
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-slate">
              SanoVault is a{" "}
              <Link
                href="/personal-health-record-app-india"
                className="font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
              >
                personal health record
              </Link>{" "}
              you control. You add the documents you have — including older
              papers and files that never entered a hospital system — and keep
              them against each person in your household.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-slate">
              It is not a hospital system, and it is not a replacement for ABHA.
              It is a place to keep the complete history you actually have.
            </p>
          </div>
        </section>

        <section
          className="border-t border-silver/70"
          aria-labelledby="steps-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="steps-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-silver bg-white p-6"
                >
                  <p className="text-sm font-semibold text-slate">
                    Step {item.step}
                  </p>
                  <h3 className="mt-2 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-slate">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="border-t border-silver/70 bg-background"
          aria-labelledby="family-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="family-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              A folder for the whole household
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-slate">
              You can keep records for yourself, for children, and for parents
              you are helping — in one family folder, with access for the people
              you invite. Invite only those who should see that folder.
            </p>
            <p className="mt-4">
              <Link
                href="/family-health-records"
                className="text-sm font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
              >
                How family health records work in SanoVault
              </Link>
            </p>
          </div>
        </section>

        <section
          className="border-t border-silver/70"
          aria-labelledby="types-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="types-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              What you can keep
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-slate">
              File the documents you already have, and keep a current medicine
              list beside them.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {RECORD_TYPES.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-silver bg-white p-6"
                >
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-slate">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="border-t border-silver/70 bg-background"
          aria-labelledby="doctor-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2
              id="doctor-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              When you see another doctor
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-slate">
              A second opinion, a new specialist, or a clinic that has never
              seen you before is easier when last year&apos;s reports are not
              buried in chat threads.
            </p>
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              <li className="rounded-2xl border border-silver bg-white p-6">
                <h3 className="font-semibold text-ink">Open the history</h3>
                <p className="mt-2 text-sm leading-6 text-blue-slate">
                  Find reports by person, date, or type instead of searching old
                  WhatsApp chats.
                </p>
              </li>
              <li className="rounded-2xl border border-silver bg-white p-6">
                <h3 className="font-semibold text-ink">Take a concise set</h3>
                <p className="mt-2 text-sm leading-6 text-blue-slate">
                  Print a medicine list, or a one-page summary of labs, blood
                  pressure and medicines.
                </p>
              </li>
              <li className="rounded-2xl border border-silver bg-white p-6">
                <h3 className="font-semibold text-ink">
                  Share one file if needed
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-slate">
                  Send a time-limited link for a specific document. You can stop
                  sharing from the app.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section
          className="border-t border-silver/70"
          aria-labelledby="privacy-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="rounded-2xl border border-silver bg-background px-6 py-8 sm:px-10">
              <h2
                id="privacy-heading"
                className="text-xl font-bold tracking-tight"
              >
                Private by design, honest about the beta
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-slate">
                Files you upload are kept in private storage and shown to people
                in your folder, unless you create a share link.{" "}
                {BETA_ACKNOWLEDGEMENT_TEXT} SanoVault does not give medical
                advice. The product is free during the beta; AI extraction and
                summaries may become paid later.
              </p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <Link
                  href="/privacy"
                  className="text-sm font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
                >
                  How records are handled
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
                >
                  Pricing
                </Link>
                <Link
                  href="/guides/how-to-organize-medical-records"
                  className="text-sm font-medium text-ink underline decoration-sage underline-offset-4 hover:text-slate"
                >
                  How to organise medical records
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-silver/70 bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <FaqSection items={HOME_FAQS} />
          </div>
        </section>
      </main>

      <MarketingCta
        heading="Keep the family folder in one place"
        body="Create a SanoVault folder, add the people you care for, and stop hunting for last month's report."
      />
    </MarketingShell>
  );
}
