import type { Metadata } from "next"

import {
  LegalDocument,
  LegalList,
  type LegalSection,
} from "@/modules/marketing/ui/components/legal-document"
import { JapandiPageShell } from "@/modules/marketing/ui/components/japandi-page-shell"

const LAST_UPDATED = "2026-08-28"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Osonflow: accounts, plans and billing, acceptable use, ownership of your content, AI output limits, and liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Osonflow",
    description:
      "The terms that govern your use of Osonflow, including billing, acceptable use, content ownership, and liability.",
    url: "/terms",
    type: "website",
  },
}

const sections: LegalSection[] = [
  {
    heading: "The agreement",
    body: (
      <>
        <p>
          These terms are a contract between you and [LEGAL_ENTITY_NAME],
          registered at [REGISTERED_ADDRESS] under number [REGISTRATION_NUMBER]
          (&ldquo;Osonflow&rdquo;, &ldquo;we&rdquo;). They apply when you create
          an account, use the product, or visit osonflow.uz.
        </p>
        <p>
          By signing up you accept these terms. If you are signing up for an
          organisation, you confirm you are authorised to bind it, and
          &ldquo;you&rdquo; means that organisation. If you do not accept these
          terms, do not use Osonflow.
        </p>
      </>
    ),
  },
  {
    heading: "Who may use Osonflow",
    body: (
      <p>
        You must be at least 18 and legally able to enter a contract. Osonflow is
        a business product and is not intended for personal or household use. You
        may not use it if you are barred from doing so under the laws of the
        Republic of Uzbekistan or any other law that applies to you.
      </p>
    ),
  },
  {
    heading: "Your account",
    body: (
      <>
        <LegalList
          items={[
            "Give accurate registration details and keep them current.",
            "Keep your credentials confidential. You are responsible for everything done under your account.",
            "Tell us promptly at support@osonflow.uz if you suspect unauthorised access.",
            "Manage your own team's access. Anyone you invite to a workspace can see the conversations and content in it, according to the role you give them.",
          ]}
        />
      </>
    ),
  },
  {
    heading: "Plans, billing, and trials",
    body: (
      <>
        <LegalList
          items={[
            "Plans are charged per team seat, not per conversation. What each plan includes is set out on our pricing page, which forms part of these terms.",
            "Paid plans are billed in advance each month in Uzbek soms unless we agree otherwise in writing. Fees exclude any taxes, which you pay in addition where they apply.",
            "Subscriptions renew automatically until you cancel. You can cancel at any time from your billing settings; cancellation takes effect at the end of the period you have already paid for.",
            "Free plans and trials are provided as they are. We may change or withdraw them at any time.",
            "We may change our prices. For existing subscriptions we will give at least 30 days' notice by email before a change applies to you, and you may cancel before it takes effect.",
            "Except where Uzbek consumer law gives you a refund right, payments already made are non-refundable. If we terminate your account for a reason other than your breach, we will refund the unused part of your prepaid period.",
          ]}
        />
        <p>
          If payment fails we may suspend the account after notifying you and
          allowing a reasonable period to fix it.
        </p>
      </>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <>
        <p>You agree not to use Osonflow to:</p>
        <LegalList
          items={[
            "Break the law, or help anyone else break it.",
            "Upload content you do not have the right to use, or that infringes someone's intellectual property or privacy.",
            "Send spam, or deploy the assistant to deceive people about whether they are talking to software.",
            "Upload malware, probe or attack our systems, or try to bypass authentication, rate limits, or workspace isolation.",
            "Reverse engineer the service, resell it, or use it to build a competing product.",
            "Place special categories of data — health, biometric, or financial account data — into workspace content unless we have agreed to it in writing beforehand.",
            "Overload the service in a way that degrades it for other customers.",
          ]}
        />
        <p>
          We may suspend an account immediately where use poses a security,
          legal, or availability risk. Otherwise we will raise the problem with
          you first and give you a chance to fix it.
        </p>
      </>
    ),
  },
  {
    heading: "Your content stays yours",
    body: (
      <>
        <p>
          You keep all rights to the documents, pages, policies, conversations,
          and customer records you put into Osonflow. We claim no ownership over
          them.
        </p>
        <p>
          You grant us a limited licence to host, copy, transmit, and process that
          content strictly to operate the service for you &mdash; including
          sending relevant extracts to the AI providers that generate answers. The
          licence lasts only as long as you keep the content in Osonflow and ends
          when you delete it. We do not use your content to train public or
          third-party AI models.
        </p>
        <p>
          You are responsible for having the right to upload what you upload, and
          for telling your own customers how their conversations are handled.
          Where we process personal data on your behalf, we do so as your
          processor and on your instructions, as described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    heading: "What AI answers can and cannot do",
    body: (
      <>
        <p>
          Osonflow answers from the content you give it, and shows the source for
          each reply. It is designed to stop and hand over to a person when it is
          not confident enough. That is a safeguard, not a guarantee.
        </p>
        <p>
          AI-generated answers can still be incomplete, out of date, or wrong. You
          are responsible for the content you supply, for the confidence
          thresholds and routing rules you set, and for reviewing what the
          assistant says to your customers on your behalf. Do not use Osonflow as
          the sole source of legal, medical, financial, or safety-critical advice.
        </p>
      </>
    ),
  },
  {
    heading: "Availability and support",
    body: (
      <p>
        We work to keep Osonflow available and fast, but we do not promise
        uninterrupted service unless a separate written service level agreement
        says so. We may carry out maintenance, and will give notice of planned
        downtime where we reasonably can. Support is provided by email at{" "}
        <a href="mailto:support@osonflow.uz">support@osonflow.uz</a> at the level
        included in your plan.
      </p>
    ),
  },
  {
    heading: "Third-party services",
    body: (
      <p>
        Osonflow connects to services we do not control, such as messaging
        channels, AI model providers, and payment processors. Your use of those
        services is governed by their own terms, and we are not responsible for
        what they do. If one of them changes or withdraws its service, the
        related Osonflow feature may change too.
      </p>
    ),
  },
  {
    heading: "Our intellectual property",
    body: (
      <p>
        The Osonflow software, interface, documentation, branding, and everything
        else we provide remain ours. These terms give you a limited,
        non-exclusive, non-transferable right to use the service while your
        subscription is active, and nothing more. If you send us feedback or
        suggestions, we may use them freely and without owing you anything.
      </p>
    ),
  },
  {
    heading: "Confidentiality",
    body: (
      <p>
        Each of us may learn confidential information about the other. Both of us
        agree to protect it with at least reasonable care, to use it only for this
        agreement, and not to disclose it &mdash; except to staff and advisers who
        need it and are bound to the same duty, or where the law compels
        disclosure. This obligation survives the end of the agreement.
      </p>
    ),
  },
  {
    heading: "Ending the agreement",
    body: (
      <>
        <p>
          You may close your account at any time from your settings. We may
          terminate or suspend your account if you materially breach these terms
          and do not fix it within 15 days of us telling you, if required by law,
          or if we discontinue the service &mdash; in which case we will give you
          at least 60 days&rsquo; notice and refund any unused prepaid fees.
        </p>
        <p>
          You can export your data before you close the account. After closure we
          keep it for 90 days so it can be restored if you change your mind, and
          then delete it as described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    heading: "Disclaimers and liability",
    body: (
      <>
        <p>
          Except as these terms expressly state, and to the fullest extent Uzbek
          law allows, Osonflow is provided as it is, without warranties of any
          kind, whether express or implied.
        </p>
        <p>
          To the fullest extent the law allows, neither party is liable for
          indirect, incidental, or consequential loss, or for lost profits,
          revenue, goodwill, or data. Our total liability for all claims arising
          in any 12-month period is limited to the fees you paid us in the 12
          months before the event giving rise to the claim.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law,
          including liability for death or personal injury caused by negligence,
          for fraud, or for a party&rsquo;s wilful misconduct. If you are a
          consumer under Uzbek law, your statutory rights are unaffected.
        </p>
      </>
    ),
  },
  {
    heading: "Governing law and disputes",
    body: (
      <p>
        These terms are governed by the law of the Republic of Uzbekistan. If a
        dispute arises, we ask that you contact us first at{" "}
        <a href="mailto:support@osonflow.uz">support@osonflow.uz</a> so we can try
        to resolve it directly. If we cannot, the dispute will be settled by the
        competent courts of the Republic of Uzbekistan.
      </p>
    ),
  },
  {
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms. For material changes we will give account
        holders at least 30 days&rsquo; notice by email or in the product before
        they take effect. Continuing to use Osonflow after that means you accept
        the new terms; if you do not, you may cancel before they apply. The date
        at the top always reflects the current version.
      </p>
    ),
  },
  {
    heading: "General",
    body: (
      <LegalList
        items={[
          "These terms, together with our Privacy Policy and pricing page, are the whole agreement between us on this subject.",
          "If a court finds any provision unenforceable, the rest stays in force.",
          "If we do not enforce a right straight away, we have not waived it.",
          "You may not transfer this agreement without our written consent. We may transfer it as part of a merger, acquisition, or sale of assets.",
          "Neither party is liable for failure to perform caused by events genuinely outside its reasonable control.",
        ]}
      />
    ),
  },
  {
    heading: "Contact us",
    body: (
      <p>
        Questions about these terms go to{" "}
        <a href="mailto:support@osonflow.uz">support@osonflow.uz</a>, or by post to
        [REGISTERED_ADDRESS].
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <JapandiPageShell>
      <LegalDocument
        lastUpdated={LAST_UPDATED}
        sections={sections}
        summary="The rules for using Osonflow: what you can expect from us, what we need from you, and how we handle money, content, and disagreements."
        title="Terms of Service"
      />
    </JapandiPageShell>
  )
}
