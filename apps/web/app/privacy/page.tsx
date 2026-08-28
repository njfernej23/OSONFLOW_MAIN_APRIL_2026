import type { Metadata } from "next"

import {
  LegalDocument,
  LegalList,
  type LegalSection,
} from "@/modules/marketing/ui/components/legal-document"
import { JapandiPageShell } from "@/modules/marketing/ui/components/japandi-page-shell"

const LAST_UPDATED = "2026-08-28"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Osonflow collects, uses, stores, and protects personal data, the rights you have over your data under Uzbek law, and how to contact us about them.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Osonflow",
    description:
      "How Osonflow collects, uses, stores, and protects personal data, and the rights you have over it.",
    url: "/privacy",
    type: "website",
  },
}

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    body: (
      <>
        <p>
          Osonflow provides an AI customer-support layer: a chat and voice widget
          for your website, a shared inbox for your team, routing, and analytics.
          This policy explains what we do with personal data when you visit
          osonflow.uz, create an account, or use the product.
        </p>
        <p>
          Osonflow is the operator of the personal data described here within the
          meaning of the Law of the Republic of Uzbekistan &ldquo;On Personal
          Data&rdquo; (No. ZRU-547). Our registered details are: [LEGAL_ENTITY_NAME],
          [REGISTRATION_NUMBER], [REGISTERED_ADDRESS]. You can reach us at any
          time at <a href="mailto:support@osonflow.uz">support@osonflow.uz</a>.
        </p>
      </>
    ),
  },
  {
    heading: "Two different roles",
    body: (
      <>
        <p>
          It matters which of these situations you are in, because your rights
          and our duties differ.
        </p>
        <LegalList
          items={[
            <>
              <strong>You are our customer.</strong> You signed up for Osonflow.
              We decide how your account data is handled, and we are the operator.
              This policy governs that relationship.
            </>,
            <>
              <strong>You contacted a business that uses Osonflow.</strong> The
              business decides what happens to your conversation; we only process
              it on their instructions. Ask that business to exercise your rights,
              and they will direct us. If you are not sure who to ask, write to us
              and we will identify them for you.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    heading: "What we collect",
    body: (
      <>
        <LegalList
          items={[
            <>
              <strong>Account data.</strong> Name, email address, password
              credentials, workspace and organisation names, team roles. Sign-in
              is handled by our authentication provider.
            </>,
            <>
              <strong>Workspace content.</strong> The documents, help-centre
              pages, website content, and policies you upload or connect so the
              assistant can answer from them, plus the conversations that flow
              through your inbox and the customer records attached to them.
            </>,
            <>
              <strong>Billing data.</strong> Plan, billing contact, and payment
              status. Card details are handled by our payment provider and never
              reach our servers.
            </>,
            <>
              <strong>Technical data.</strong> IP address, browser and device
              type, pages viewed, and timestamps, recorded in server logs so we
              can keep the service running and secure.
            </>,
            <>
              <strong>Voice data.</strong> Where you enable voice support, audio
              from the conversation and its transcript, handled the same way as
              chat messages.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    heading: "Why we use it",
    body: (
      <>
        <p>We use personal data only for these purposes:</p>
        <LegalList
          items={[
            "To provide the service you signed up for, including answering your customers and routing conversations to your team.",
            "To authenticate users, protect accounts, and prevent abuse or fraud.",
            "To bill you and keep the financial records the law requires us to keep.",
            "To respond when you contact support.",
            "To keep the service reliable, diagnose faults, and improve how it works.",
            "To send service messages about outages, security, and material changes to this policy. These are not marketing and you cannot unsubscribe from them while you hold an account.",
          ]}
        />
        <p>
          We process this data on the basis of your consent, and because it is
          necessary to perform our contract with you and to meet our legal
          obligations. Where we rely on consent, you can withdraw it at any time,
          which does not affect processing carried out before you withdrew it.
        </p>
      </>
    ),
  },
  {
    heading: "What we never do",
    body: (
      <LegalList
        items={[
          "We do not sell personal data.",
          "We do not use your workspace content to train public or third-party AI models.",
          "We do not share one customer's content with another customer.",
          "We do not use your customers' conversations for our own marketing.",
        ]}
      />
    ),
  },
  {
    heading: "Cookies and local storage",
    body: (
      <>
        <p>
          We keep this deliberately small. At present Osonflow sets only cookies
          that are strictly necessary for the site and product to function:
        </p>
        <LegalList
          items={[
            <>
              <strong>Authentication cookies</strong>, set by our sign-in
              provider, which keep you logged in and protect against
              cross-site request forgery.
            </>,
            <>
              <strong>A language preference</strong>, stored in your browser&rsquo;s
              local storage so the site stays in English, O&rsquo;zbek, or Russian
              between visits.
            </>,
            <>
              <strong>A cookie-notice preference</strong>, recording that you have
              seen and answered the notice so we do not show it again.
            </>,
          ]}
        />
        <p>
          We do not currently run advertising, profiling, or third-party analytics
          cookies. If that changes, we will ask for your consent before setting
          them, and you will be able to decline and keep using the site.
        </p>
      </>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <>
        <p>
          We share personal data only with service providers that help us run
          Osonflow, and only as far as they need it. Each is bound by contract to
          protect it and to use it for nothing else. These currently cover
          authentication, application and database hosting, AI model inference,
          voice processing, payments, and email delivery.
        </p>
        <p>
          A current list of these providers is available on request from{" "}
          <a href="mailto:support@osonflow.uz">support@osonflow.uz</a>. We will
          also disclose data where the law or a valid order from a competent
          authority requires it, and, if Osonflow is ever sold or merged, to the
          acquiring party under the same protections.
        </p>
      </>
    ),
  },
  {
    heading: "Where it is stored",
    body: (
      <>
        <p>
          Uzbek law requires personal data of citizens of the Republic of
          Uzbekistan to be processed using databases physically located in
          Uzbekistan. Our hosting arrangements for that data are described here:
          [DATA_LOCALISATION_STATEMENT &mdash; name the hosting provider and the
          Uzbek data centre or local database you use, and confirm registration
          with the State Personalization Agency where applicable].
        </p>
        <p>
          Some of our service providers operate outside Uzbekistan. Where data
          crosses a border, we transfer it only to countries that provide adequate
          protection or under contractual safeguards, and only to the extent
          needed to deliver the service.
        </p>
      </>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <LegalList
        items={[
          "Account data: for as long as your account is open, and up to 90 days after you close it so the account can be restored if closure was a mistake.",
          "Workspace content and conversations: for as long as you keep them. You can delete them at any time, and deletion removes them from our live systems immediately and from backups within 30 days.",
          "Billing records: for the period Uzbek accounting and tax law requires.",
          "Server logs: up to 12 months, then deleted or anonymised.",
        ]}
      />
    ),
  },
  {
    heading: "How we protect it",
    body: (
      <p>
        Data is encrypted in transit and at rest. Access inside Osonflow is
        restricted to staff who need it for their work and is logged. Each
        customer&rsquo;s workspace is isolated from every other. No system is
        perfectly secure, but if a breach affects your personal data we will tell
        you and the competent authority without undue delay, and explain what
        happened and what we are doing about it.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <>
        <p>Under Uzbek personal data law you may:</p>
        <LegalList
          items={[
            "Ask what personal data we hold about you and get a copy of it.",
            "Have inaccurate or incomplete data corrected.",
            "Have your data deleted, and have processing blocked while a dispute is resolved.",
            "Withdraw consent you previously gave.",
            "Object to processing, and ask us to explain the basis for it.",
            "Complain to the State Personalization Agency of the Republic of Uzbekistan if you believe we have handled your data unlawfully.",
          ]}
        />
        <p>
          Write to <a href="mailto:support@osonflow.uz">support@osonflow.uz</a> to
          exercise any of these. We will respond within the period set by law, and
          in any event without undue delay. We may need to verify your identity
          first, so that we do not hand your data to someone else.
        </p>
      </>
    ),
  },
  {
    heading: "Children",
    body: (
      <p>
        Osonflow is a business tool and is not directed at children. We do not
        knowingly collect personal data from anyone under 18. If you believe a
        child has given us personal data, tell us and we will delete it.
      </p>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <p>
        We will update this page when our practices change. The date at the top
        always reflects the current version. If a change materially affects your
        rights, we will tell account holders by email before it takes effect
        rather than relying on you to notice.
      </p>
    ),
  },
  {
    heading: "Contact us",
    body: (
      <p>
        Questions, requests, or complaints about privacy go to{" "}
        <a href="mailto:support@osonflow.uz">support@osonflow.uz</a>, or by post to
        [REGISTERED_ADDRESS]. A person will answer, not the assistant.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <JapandiPageShell>
      <LegalDocument
        lastUpdated={LAST_UPDATED}
        sections={sections}
        summary="What we collect, why we collect it, who we share it with, and what you can ask us to do about it. Written to be read, not to be survived."
        title="Privacy Policy"
      />
    </JapandiPageShell>
  )
}
