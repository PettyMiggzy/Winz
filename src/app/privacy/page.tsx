import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections: LegalSection[] = [
  {
    h: "What we collect",
    body: (
      <>
        <p>We collect only what we need to run the service:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong className="text-chalk">Account info</strong> — your email and login details.</li>
          <li><strong className="text-chalk">Connected-platform data</strong> — access tokens and basic profile/account info for the accounts you connect (e.g. TikTok, YouTube, Instagram, Kick), so we can publish on your behalf.</li>
          <li><strong className="text-chalk">Your content</strong> — the streams, recordings, and clips you upload or capture through Winz, plus derived data like transcripts and highlight scores.</li>
          <li><strong className="text-chalk">Usage data</strong> — how you use the dashboard, and post performance metrics we retrieve from connected platforms.</li>
        </ul>
      </>
    ),
  },
  {
    h: "How we use it",
    body: (
      <>
        <p>We use your information to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>detect highlights, generate clips, captions, and titles;</li>
          <li>publish clips to the accounts you connect, per your settings;</li>
          <li>show you analytics and improve highlight selection;</li>
          <li>operate, secure, and support the service.</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your private
          content to train models for anyone else.
        </p>
      </>
    ),
  },
  {
    h: "Platform data",
    body: (
      <p>
        When you connect a platform, we access only the permissions you grant
        through that platform&rsquo;s official authorization. We use that access solely
        to provide Winz&rsquo;s features (for example, publishing a clip or reading a
        post&rsquo;s view count). Our use of information from Google APIs adheres to the
        Google API Services User Data Policy, including the Limited Use
        requirements, and our use of Meta and TikTok platform data adheres to
        their respective platform terms.
      </p>
    ),
  },
  {
    h: "Sharing",
    body: (
      <p>
        We share data only with service providers that help us operate Winz (such
        as hosting, storage, transcription, and analytics providers), under
        confidentiality obligations, and with the platforms you publish to. We may
        disclose information if required by law.
      </p>
    ),
  },
  {
    h: "Retention",
    body: (
      <p>
        We keep source recordings and clips only as long as needed to provide the
        service, then delete or anonymize them on a rolling schedule. You can
        delete individual clips, disconnect accounts, or delete your account at any
        time.
      </p>
    ),
  },
  {
    h: "Your choices and rights",
    body: (
      <p>
        You can access, correct, export, or delete your information from your
        account settings or by contacting us. Disconnecting a platform revokes
        Winz&rsquo;s access to it. Depending on where you live, you may have additional
        rights under laws such as the GDPR or CCPA.
      </p>
    ),
  },
  {
    h: "Deleting your data",
    body: (
      <p>
        To delete your account and associated data, use the delete option in
        settings or email{" "}
        <a href="mailto:privacy@winz.app" className="text-chalk hover:text-brand">privacy@winz.app</a>.
        We will process the request and remove your content from our systems and
        connected-platform tokens within a reasonable period.
      </p>
    ),
  },
  {
    h: "Children",
    body: (
      <p>
        Winz is not directed to children. You must be 18 or older to use it, and we
        do not knowingly collect information from anyone under 13.
      </p>
    ),
  },
  {
    h: "Changes and contact",
    body: (
      <p>
        We may update this policy; material changes will be posted here with a new
        date. Questions or requests? Contact{" "}
        <a href="mailto:privacy@winz.app" className="text-chalk hover:text-brand">privacy@winz.app</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="August 16, 2026"
      intro={
        <p>
          This policy explains what Winz collects, how we use it, and the choices
          you have. We try to keep it plain and short.
        </p>
      }
      sections={sections}
    />
  );
}
