import Link from 'next/link';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { publicPageMetadata } from '@/lib/seo';
import { privacyPolicy } from '@/lib/legal/privacy';

export const metadata = publicPageMetadata({
  title: 'Terms and Conditions | SanoVault',
  description: 'Terms for using SanoVault to manage family medical records, including account responsibilities, sharing, AI features and beta availability.',
  path: '/terms',
});

const sections = [
  ['Who we are and these terms', 'SanoVault is operated by Argali Knowledge Services Private Limited, 4th Floor, Statesman House, Barakhamba Road, New Delhi 110001, India. These terms govern your use of our website and apps. By creating an account or using SanoVault, you agree to these terms. If you do not agree, do not use the service. Contact support@eisenvault.com with questions.'],
  ['Eligibility and your account', 'You must be at least 18 and able to enter into a binding agreement to create an account. Provide accurate information, keep sign-in credentials secure, and tell us promptly if you suspect unauthorised access. Only upload or manage another person’s records when you have their permission or legal authority. A parent or authorised guardian may manage children’s records.'],
  ['What the service does', 'SanoVault helps you store, organise and share records, track information you enter, and prepare summaries. It is not an emergency service, medical advice, a diagnosis, or a replacement for a qualified healthcare professional. For an emergency, contact your local emergency services. Keep original records and independent copies of important information.'],
  ['Beta service and pricing', 'SanoVault is currently a beta product and is free to use during the beta. Features may change, contain errors, or be unavailable. AI extraction and summaries may become paid features later. We will explain applicable prices and payment terms before asking you to purchase; these terms do not authorise a future charge.'],
  ['Your records and sharing', 'You retain your rights in the content you upload. You grant us permission to host, process, display and transmit it as needed to provide the features you request, as described in the Privacy Policy. Family-folder members can access linked patients and records. Share links can be used by anyone who holds them until expiry or revocation. Recipients may keep downloaded copies. Check recipients and permissions before sharing.'],
  ['AI and extracted information', 'Optional AI and OCR features can misread documents or produce incomplete or incorrect results. Verify names, dates, medicines, dosages, units and summaries against the original before relying on or sharing them. AI processing choices and the providers involved are described in the Privacy Policy and AI settings. Do not make medical decisions based solely on generated output.'],
  ['Acceptable use', 'Do not upload content you have no right to use, access someone else’s account or records without authority, distribute malware, send spam, scrape private data, bypass security or rate limits, or interfere with the service. We may restrict access to prevent abuse, protect users or comply with law. Where appropriate and feasible, we will give notice and a way to contact support.'],
  ['Privacy, exports and deletion', 'Our Privacy Policy explains the information we process, service providers, international processing, retention and your choices. You can download documents and use account deletion or contact support. Deleting your login does not necessarily delete patient records shared with other families, or copies other people downloaded. See the deletion page and Privacy Policy for details.'],
  ['Availability and responsibility', 'We take reasonable care in providing SanoVault but cannot guarantee uninterrupted access, that every error will be corrected, or that all uploaded information is accurate. To the extent permitted by applicable law, we are not responsible for indirect losses resulting from misuse, reliance on unverified output, or events outside our reasonable control. Nothing in these terms excludes liability or consumer rights that cannot lawfully be excluded.'],
  ['Ending use and changes', 'You may stop using the service and request deletion at any time. We may suspend access for a material breach or discontinue features or the service. Where feasible, we will provide notice of discontinuation and an opportunity to export records. We will publish revised terms with an updated date and provide notice or seek agreement to material changes where required.'],
  ['Applicable law and contact', 'These terms are governed by the laws of India, subject to any mandatory protections and rights that apply to you. Contact support@eisenvault.com to raise a concern or try to resolve a dispute. These terms do not limit your right to approach an authority or court with jurisdiction under applicable law.'],
];

export default function TermsPage() {
  return <MarketingShell><main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <h1 className="text-3xl font-bold tracking-tight">Terms and Conditions</h1>
    <p className="mt-3 text-sm text-blue-slate">Updated 22 November 2026 · {privacyPolicy.operator}</p>
    {sections.map(([title, text]) => <section key={title} className="mt-9">
      <h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-blue-slate">{text}</p>
    </section>)}
    <nav aria-label="Related policies" className="mt-9 flex flex-wrap gap-5 text-coral underline">
      <Link href="/privacy">Privacy Policy</Link><Link href="/delete-account">Delete your account</Link>
    </nav>
  </main></MarketingShell>;
}
