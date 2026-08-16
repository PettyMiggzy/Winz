import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = { title: "Terms of Service" };

const sections: LegalSection[] = [
  {
    h: "The service",
    body: (
      <p>
        WinClipz (&ldquo;WinClipz&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a tool that helps creators turn their
        own livestreams into short clips and publish them to social accounts the
        creator connects. You (&ldquo;you&rdquo;, the &ldquo;user&rdquo;) use the service subject to
        these Terms.
      </p>
    ),
  },
  {
    h: "Eligibility",
    body: (
      <p>
        You must be at least 18 years old (or the age of majority where you live)
        to use WinClipz. By using the service you represent that you meet this
        requirement and that the information you give us is accurate.
      </p>
    ),
  },
  {
    h: "Your content and your rights",
    body: (
      <>
        <p>
          You keep ownership of the streams, clips, and other material you upload
          or connect (&ldquo;Your Content&rdquo;). You grant WinClipz a limited, non-exclusive
          license to store, process, transcode, edit, and transmit Your Content
          solely to provide the service to you — including detecting highlights,
          generating captions and clips, and publishing to accounts you connect.
        </p>
        <p className="font-medium text-chalk">
          You represent and warrant that you own or have all necessary rights to
          Your Content and to distribute it on every platform you connect, and
          that it does not infringe anyone else&rsquo;s rights.
        </p>
        <p>
          WinClipz is designed for creators to distribute their <em>own</em> content.
          Do not use it to process or repost streams, videos, music, or other
          material you do not have the right to use.
        </p>
      </>
    ),
  },
  {
    h: "Connected accounts",
    body: (
      <p>
        You connect third-party accounts (such as TikTok, YouTube, and Instagram)
        through those platforms&rsquo; official authorization flows. You authorize WinClipz
        to publish content to those accounts on your behalf according to your
        settings. Your use of each platform remains subject to that platform&rsquo;s own
        terms, and you are responsible for complying with them. You can disconnect
        any account at any time.
      </p>
    ),
  },
  {
    h: "Music and third-party material",
    body: (
      <p>
        Clips generated from your streams may contain music or other third-party
        material captured in your broadcast. WinClipz provides tools to detect and
        remove flagged audio, but does not guarantee that any clip is free of
        third-party claims. You are solely responsible for the audio and visual
        content of clips you publish and for any resulting claims, strikes, mutes,
        or takedowns on your accounts.
      </p>
    ),
  },
  {
    h: "Acceptable use",
    body: (
      <>
        <p>You agree not to use WinClipz to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>process or distribute content you don&rsquo;t have the rights to;</li>
          <li>impersonate anyone or misrepresent your affiliation;</li>
          <li>post unlawful, deceptive, or platform-violating content;</li>
          <li>generate artificial views or engagement; or</li>
          <li>interfere with or attempt to circumvent the service&rsquo;s limits or security.</li>
        </ul>
      </>
    ),
  },
  {
    h: "Copyright and repeat infringers (DMCA)",
    body: (
      <p>
        We respond to notices of alleged copyright infringement and, in
        appropriate cases, terminate the accounts of repeat infringers. To submit
        a notice, contact our designated agent at{" "}
        <a href="mailto:legal@winz.app" className="text-chalk hover:text-brand">legal@winz.app</a>.
        A valid notice must include the information required under 17 U.S.C.
        § 512(c)(3).
      </p>
    ),
  },
  {
    h: "Beta service",
    body: (
      <p>
        WinClipz is currently offered as a free beta. It is provided &ldquo;as is,&rdquo; may
        change or be discontinued, and may contain errors. Features, limits, and
        pricing may change. We may introduce paid plans in the future; where we
        say so, early users may receive founding-creator pricing.
      </p>
    ),
  },
  {
    h: "Disclaimers",
    body: (
      <p>
        WinClipz does not guarantee any particular growth, views, followers, revenue,
        or results. To the fullest extent permitted by law, the service is
        provided without warranties of any kind, express or implied.
      </p>
    ),
  },
  {
    h: "Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, WinClipz and its operators will not be
        liable for any indirect, incidental, special, consequential, or punitive
        damages, or for lost profits, revenues, data, or goodwill, arising out of
        or related to your use of the service.
      </p>
    ),
  },
  {
    h: "Indemnification",
    body: (
      <p>
        You agree to indemnify and hold WinClipz harmless from claims, damages, and
        expenses (including reasonable legal fees) arising from Your Content, your
        use of the service, or your violation of these Terms or any third-party
        rights.
      </p>
    ),
  },
  {
    h: "Changes and contact",
    body: (
      <p>
        We may update these Terms; material changes will be posted here with a new
        &ldquo;last updated&rdquo; date. Questions? Contact{" "}
        <a href="mailto:hello@winz.app" className="text-chalk hover:text-brand">hello@winz.app</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="August 16, 2026"
      intro={
        <p>
          These Terms govern your use of WinClipz. Please read them carefully. By
          creating an account or using the service, you agree to them.
        </p>
      }
      sections={sections}
    />
  );
}
