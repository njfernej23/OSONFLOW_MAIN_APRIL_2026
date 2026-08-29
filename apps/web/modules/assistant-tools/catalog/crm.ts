import {
  CreditCardIcon,
  HeadsetIcon,
  LifeBuoyIcon,
  PackageSearchIcon,
  ReceiptIcon,
  RefreshCcwIcon,
  RepeatIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserPlusIcon,
  UserSearchIcon,
  UsersIcon,
} from "lucide-react"

import {
  bearerAuth,
  headerAuth,
  num,
  opt,
  p,
  plannedBlueprint,
  restBlueprint,
} from "./helpers"
import type { ToolBlueprint } from "./types"

/** The systems of record a support conversation actually needs to read. */
export const crmBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "hubspot_contact_lookup",
    title: "HubSpot contact lookup",
    vendor: "HubSpot",
    brand: "#ff7a59",
    category: "crm",
    icon: UserSearchIcon,
    tone: "warning",
    effect: "read",
    featured: true,
    summary:
      "Search the CRM by email so the assistant answers with the customer's real record.",
    tags: ["CRM", "Search", "Private app"],
    highlights: [
      "Reads with a private-app token scoped to the properties you list — nothing else is exposed.",
      "Returns the properties named in the body, so the model never sees the whole contact.",
      "Read-only: no CRM record is created or changed by this tool.",
    ],
    auth: bearerAuth(
      "Private app access token",
      "Settings → Integrations → Private Apps, with crm.objects.contacts.read.",
      "https://developers.hubspot.com/docs/api/private-apps"
    ),
    hostHints: ["api.hubapi.com"],
    endpoint: "https://api.hubapi.com/crm/v3/objects/contacts/search",
    endpointPlaceholder:
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
    docsUrl: "https://developers.hubspot.com/docs/api/crm/contacts",
    setupHint:
      "Create a private app with contact read scope and paste its token as the credential.",
    tool: {
      name: "lookup_hubspot_contact",
      description:
        "Look up a customer in HubSpot by their email address to confirm plan, owner and lifecycle stage.",
      method: "POST",
      headers: { Authorization: "Bearer pat-na1-your-token" },
      body: {
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: "{{email}}" },
            ],
          },
        ],
        properties: ["email", "firstname", "lastname", "lifecyclestage"],
        limit: 1,
      },
      parameters: [p("email", "The customer's email address.")],
    },
  }),
  restBlueprint({
    id: "hubspot_create_contact",
    title: "HubSpot contact create",
    vendor: "HubSpot",
    brand: "#ff7a59",
    category: "crm",
    icon: UserPlusIcon,
    tone: "warning",
    effect: "write",
    summary:
      "Capture a qualified lead into the CRM without an operator retyping the conversation.",
    tags: ["CRM", "Lead capture"],
    highlights: [
      "Writes only the properties in the template, so a stray field cannot be invented.",
      "Needs crm.objects.contacts.write on the private app token.",
    ],
    auth: bearerAuth(
      "Private app access token",
      "Requires crm.objects.contacts.write.",
      "https://developers.hubspot.com/docs/api/private-apps"
    ),
    hostHints: ["api.hubapi.com"],
    endpoint: "https://api.hubapi.com/crm/v3/objects/contacts",
    endpointPlaceholder: "https://api.hubapi.com/crm/v3/objects/contacts",
    docsUrl: "https://developers.hubspot.com/docs/api/crm/contacts",
    setupHint:
      "Give the private app contact write scope, then add any extra properties to the body template.",
    tool: {
      name: "create_hubspot_contact",
      description:
        "Create a contact in HubSpot for a new lead captured during the conversation.",
      method: "POST",
      headers: { Authorization: "Bearer pat-na1-your-token" },
      body: {
        properties: {
          email: "{{email}}",
          firstname: "{{first_name}}",
          lastname: "{{last_name}}",
          company: "{{company}}",
        },
      },
      parameters: [
        p("email", "The lead's email address."),
        p("first_name", "The lead's first name."),
        opt("last_name", "The lead's last name."),
        opt("company", "Company the lead works for."),
      ],
    },
  }),
  restBlueprint({
    id: "zendesk_ticket",
    title: "Zendesk ticket",
    vendor: "Zendesk",
    brand: "#03363d",
    category: "crm",
    icon: TicketIcon,
    tone: "positive",
    effect: "write",
    summary:
      "Open a support ticket with the conversation's context when the assistant cannot finish the job.",
    tags: ["Support", "Basic auth"],
    highlights: [
      "Files against the requester's own email, so the ticket threads to their existing history.",
      "Priority is a parameter — the assistant can escalate a genuine outage.",
      "Uses an API token, not an agent password.",
    ],
    auth: {
      kind: "basic",
      label: "Agent email and API token",
      hint: "Base64 of agent@example.com/token:your_api_token.",
      docsUrl:
        "https://developer.zendesk.com/api-reference/introduction/security-and-auth/",
    },
    hostHints: ["zendesk.com/api"],
    endpointPlaceholder: "https://yourdomain.zendesk.com/api/v2/tickets.json",
    docsUrl:
      "https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/",
    setupHint:
      "Swap yourdomain for your Zendesk subdomain, and enable token access in Admin → API.",
    tool: {
      name: "create_zendesk_ticket",
      description:
        "Open a Zendesk support ticket describing the customer's unresolved issue.",
      method: "POST",
      headers: { Authorization: "Basic BASE64_OF_EMAIL_TOKEN_COLON_TOKEN" },
      body: {
        ticket: {
          subject: "{{subject}}",
          comment: { body: "{{description}}" },
          priority: "{{priority}}",
          requester: { email: "{{requester_email}}" },
        },
      },
      parameters: [
        p("subject", "Short subject line for the ticket."),
        p("description", "Full description of the issue, including context."),
        p("requester_email", "Email address of the customer raising it."),
        opt("priority", "One of low, normal, high or urgent."),
      ],
    },
  }),
  restBlueprint({
    id: "zendesk_ticket_lookup",
    title: "Zendesk ticket status",
    vendor: "Zendesk",
    brand: "#03363d",
    category: "crm",
    icon: LifeBuoyIcon,
    tone: "positive",
    effect: "read",
    summary:
      'Answer "where is my ticket?" from the live queue instead of promising a follow-up.',
    tags: ["Support", "Search", "Read-only"],
    highlights: [
      "Search syntax goes straight through, so requester, status and tag filters all work.",
      "Read-only token scope is enough.",
    ],
    auth: {
      kind: "basic",
      label: "Agent email and API token",
      hint: "Base64 of agent@example.com/token:your_api_token.",
      docsUrl:
        "https://developer.zendesk.com/api-reference/introduction/security-and-auth/",
    },
    hostHints: ["zendesk.com/api"],
    endpointPlaceholder: "https://yourdomain.zendesk.com/api/v2/search.json",
    docsUrl:
      "https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/",
    setupHint:
      "The query parameter is passed straight to Zendesk search — teach the assistant the syntax in the description.",
    tool: {
      name: "lookup_zendesk_tickets",
      description:
        "Search Zendesk for the customer's tickets, e.g. type:ticket requester:customer@example.com.",
      method: "GET",
      headers: { Authorization: "Basic BASE64_OF_EMAIL_TOKEN_COLON_TOKEN" },
      parameters: [
        p(
          "query",
          "Zendesk search query, e.g. type:ticket requester:customer@example.com status<solved."
        ),
      ],
    },
  }),
  restBlueprint({
    id: "intercom_contact_lookup",
    title: "Intercom contact lookup",
    vendor: "Intercom",
    brand: "#1f8ded",
    category: "crm",
    icon: HeadsetIcon,
    tone: "info",
    effect: "read",
    summary:
      "Pull the customer's Intercom record so the assistant knows the plan and the history.",
    tags: ["Support", "Search", "Bearer"],
    highlights: [
      "Searches by email against the workspace's contacts.",
      "Returns custom attributes, so plan and account tier come through.",
    ],
    auth: bearerAuth(
      "Intercom access token",
      "From the Developer Hub app's Authentication tab.",
      "https://developers.intercom.com/docs/build-an-integration/learn-more/authentication"
    ),
    hostHints: ["api.intercom.io"],
    endpoint: "https://api.intercom.io/contacts/search",
    endpointPlaceholder: "https://api.intercom.io/contacts/search",
    docsUrl:
      "https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/searchcontacts",
    setupHint:
      "Paste an access token with contact read permission — the query shape is already in the body.",
    tool: {
      name: "lookup_intercom_contact",
      description:
        "Find the customer's Intercom contact record from their email address.",
      method: "POST",
      headers: {
        Authorization: "Bearer dG9rOme…",
        "Intercom-Version": "2.11",
      },
      body: {
        query: { field: "email", operator: "=", value: "{{email}}" },
      },
      parameters: [p("email", "The customer's email address.")],
    },
  }),
  restBlueprint({
    id: "freshdesk_ticket",
    title: "Freshdesk ticket",
    vendor: "Freshdesk",
    brand: "#25c16f",
    category: "crm",
    icon: TicketIcon,
    tone: "positive",
    effect: "write",
    summary:
      "Raise a Freshdesk ticket with the transcript attached to the customer's email.",
    tags: ["Support", "Basic auth"],
    highlights: [
      "The API key doubles as the basic-auth username, so no agent password is stored.",
      "Status and priority default to open and normal unless the assistant sets them.",
    ],
    auth: {
      kind: "basic",
      label: "API key",
      hint: "Base64 of your_api_key:X — the password half is literally X.",
      docsUrl: "https://developers.freshdesk.com/api/#authentication",
    },
    hostHints: ["freshdesk.com/api"],
    endpointPlaceholder: "https://yourdomain.freshdesk.com/api/v2/tickets",
    docsUrl: "https://developers.freshdesk.com/api/#create_ticket",
    setupHint: "Swap yourdomain for your Freshdesk subdomain before saving.",
    tool: {
      name: "create_freshdesk_ticket",
      description:
        "Create a Freshdesk ticket for an issue the assistant could not resolve.",
      method: "POST",
      headers: { Authorization: "Basic BASE64_OF_API_KEY_COLON_X" },
      body: {
        subject: "{{subject}}",
        description: "{{description}}",
        email: "{{requester_email}}",
        priority: 1,
        status: 2,
      },
      parameters: [
        p("subject", "Short subject line for the ticket."),
        p("description", "Full description of the issue."),
        p("requester_email", "Email address of the customer raising it."),
      ],
    },
  }),
  restBlueprint({
    id: "stripe_customer_lookup",
    title: "Stripe customer lookup",
    vendor: "Stripe",
    brand: "#635bff",
    category: "crm",
    icon: CreditCardIcon,
    tone: "accent",
    effect: "read",
    featured: true,
    summary:
      "Confirm who is asking and what they pay for, straight from billing.",
    tags: ["Billing", "Read-only", "Restricted key"],
    highlights: [
      "Use a restricted key with read access to customers only — it cannot move money.",
      "Matches on email, the field a customer can actually give you over chat.",
      "Never returns card numbers: Stripe only exposes the last four digits.",
    ],
    auth: bearerAuth(
      "Restricted API key",
      "Create one under Developers → API keys with customer read access.",
      "https://stripe.com/docs/keys#limit-access"
    ),
    hostHints: ["api.stripe.com"],
    endpoint: "https://api.stripe.com/v1/customers",
    endpointPlaceholder: "https://api.stripe.com/v1/customers",
    docsUrl: "https://stripe.com/docs/api/customers/list",
    setupHint:
      "A restricted key with read-only customer access is enough — never paste a secret key here.",
    tool: {
      name: "lookup_stripe_customer",
      description:
        "Look up a Stripe customer by email to confirm their billing status.",
      method: "GET",
      headers: { Authorization: "Bearer rk_live_your_restricted_key" },
      parameters: [p("email", "Email address on the Stripe customer record.")],
    },
  }),
  restBlueprint({
    id: "stripe_subscription_lookup",
    title: "Stripe subscription lookup",
    vendor: "Stripe",
    brand: "#635bff",
    category: "crm",
    icon: RepeatIcon,
    tone: "accent",
    effect: "read",
    summary:
      "Tell the customer which plan they are on and when it renews, without an operator.",
    tags: ["Billing", "Read-only"],
    highlights: [
      "Takes the customer id returned by the lookup tool, so the two chain naturally.",
      "Shows status, current period end and the price the customer is on.",
    ],
    auth: bearerAuth(
      "Restricted API key",
      "Read access to subscriptions.",
      "https://stripe.com/docs/keys#limit-access"
    ),
    hostHints: ["api.stripe.com"],
    endpoint: "https://api.stripe.com/v1/subscriptions",
    endpointPlaceholder: "https://api.stripe.com/v1/subscriptions",
    docsUrl: "https://stripe.com/docs/api/subscriptions/list",
    setupHint:
      "Pair this with the customer lookup so the assistant already has a cus_ id to pass.",
    tool: {
      name: "lookup_stripe_subscription",
      description:
        "List the Stripe subscriptions for a customer id to confirm plan and renewal date.",
      method: "GET",
      headers: { Authorization: "Bearer rk_live_your_restricted_key" },
      parameters: [
        p("customer", "Stripe customer id, in the form cus_XXXXXXXX."),
      ],
    },
  }),
  restBlueprint({
    id: "stripe_refund",
    title: "Stripe refund",
    vendor: "Stripe",
    brand: "#635bff",
    category: "crm",
    icon: ReceiptIcon,
    tone: "critical",
    effect: "write",
    summary:
      "Issue a refund on a specific charge — the highest-trust action in the catalog.",
    tags: ["Billing", "Writes money", "Form encoded"],
    highlights: [
      "Moves real money: keep it off voice and describe the policy precisely in the tool description.",
      "Scoped to one charge id, so the assistant cannot refund an account wholesale.",
      "Amount is optional — omit it for a full refund of that charge.",
    ],
    auth: bearerAuth(
      "Restricted API key with refund write",
      "Grant refunds write and nothing else.",
      "https://stripe.com/docs/keys#limit-access"
    ),
    hostHints: ["api.stripe.com"],
    endpoint: "https://api.stripe.com/v1/refunds",
    endpointPlaceholder: "https://api.stripe.com/v1/refunds",
    docsUrl: "https://stripe.com/docs/api/refunds/create",
    setupHint:
      "Write the refund policy into the tool description — it is the only thing gating the call.",
    tool: {
      name: "issue_stripe_refund",
      description:
        "Refund a Stripe charge when the customer qualifies under the published refund policy.",
      method: "POST",
      headers: {
        Authorization: "Bearer rk_live_your_restricted_key",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "charge={{charge}}&amount={{amount}}",
      parameters: [
        p("charge", "Stripe charge id to refund, in the form ch_XXXXXXXX."),
        num("amount", "Amount to refund in the smallest currency unit.", false),
      ],
    },
  }),
  restBlueprint({
    id: "shopify_order_lookup",
    title: "Shopify order lookup",
    vendor: "Shopify",
    brand: "#95bf47",
    category: "crm",
    icon: PackageSearchIcon,
    tone: "positive",
    effect: "read",
    featured: true,
    summary:
      'Answer "where is my order?" with the real fulfilment status and tracking number.',
    tags: ["Commerce", "Admin API", "Read-only"],
    highlights: [
      "Matches on the order name the customer reads off their confirmation email.",
      "A custom app token with read_orders is the whole permission surface.",
      "Returns fulfilment status and tracking, so the assistant can answer in one turn.",
    ],
    auth: headerAuth(
      "X-Shopify-Access-Token",
      "Admin API access token",
      "From a custom app in your store's admin, with read_orders.",
      "https://shopify.dev/docs/apps/auth/admin-app-access-tokens"
    ),
    hostHints: ["myshopify.com/admin"],
    endpointPlaceholder:
      "https://your-store.myshopify.com/admin/api/2024-10/orders.json",
    docsUrl: "https://shopify.dev/docs/api/admin-rest/2024-10/resources/order",
    setupHint:
      "Swap your-store for your shop domain and install a custom app with read_orders.",
    tool: {
      name: "lookup_shopify_order",
      description:
        "Look up a Shopify order by its order number to report status and tracking.",
      method: "GET",
      headers: { "X-Shopify-Access-Token": "shpat_your_token" },
      parameters: [
        p("name", "Order number as the customer sees it, e.g. #1001."),
        opt("status", "Order status filter — any, open, closed or cancelled."),
      ],
    },
  }),
  restBlueprint({
    id: "shopify_customer_lookup",
    title: "Shopify customer lookup",
    vendor: "Shopify",
    brand: "#95bf47",
    category: "crm",
    icon: ShoppingBagIcon,
    tone: "positive",
    effect: "read",
    summary:
      "Find the shopper's account to confirm the email on file and their order history.",
    tags: ["Commerce", "Search", "Read-only"],
    highlights: [
      "Search syntax accepts email:, phone: and name: filters.",
      "Needs read_customers on the custom app token.",
    ],
    auth: headerAuth(
      "X-Shopify-Access-Token",
      "Admin API access token",
      "Needs read_customers.",
      "https://shopify.dev/docs/apps/auth/admin-app-access-tokens"
    ),
    hostHints: ["myshopify.com/admin"],
    endpointPlaceholder:
      "https://your-store.myshopify.com/admin/api/2024-10/customers/search.json",
    docsUrl:
      "https://shopify.dev/docs/api/admin-rest/2024-10/resources/customer#get-customers-search",
    setupHint: "Swap your-store for your shop domain before saving.",
    tool: {
      name: "lookup_shopify_customer",
      description:
        "Search Shopify customers, e.g. email:customer@example.com, to confirm the account.",
      method: "GET",
      headers: { "X-Shopify-Access-Token": "shpat_your_token" },
      parameters: [
        p("query", "Search query, e.g. email:customer@example.com."),
      ],
    },
  }),
  restBlueprint({
    id: "pipedrive_person_lookup",
    title: "Pipedrive person lookup",
    vendor: "Pipedrive",
    brand: "#017737",
    category: "crm",
    icon: UsersIcon,
    tone: "positive",
    effect: "read",
    summary:
      "Check whether the person in the conversation is already in the pipeline, and who owns them.",
    tags: ["CRM", "Search", "API token"],
    highlights: [
      "The API token travels as a query parameter, so no header setup is needed.",
      "Returns the owner, so the assistant can name the right account manager.",
    ],
    auth: {
      kind: "query",
      label: "API token in the endpoint",
      hint: "Append ?api_token=… to the URL — from Personal preferences → API.",
      docsUrl: "https://pipedrive.readme.io/docs/how-to-find-the-api-token",
    },
    hostHints: ["api.pipedrive.com"],
    endpointPlaceholder:
      "https://api.pipedrive.com/v1/persons/search?api_token=your_token",
    docsUrl:
      "https://developers.pipedrive.com/docs/api/v1/Persons#searchPersons",
    setupHint:
      "Append your API token to the endpoint as ?api_token=… before saving.",
    tool: {
      name: "lookup_pipedrive_person",
      description:
        "Search Pipedrive for a person by name or email to find their deal owner.",
      method: "GET",
      parameters: [p("term", "Name, email or phone number to search for.")],
    },
  }),
  plannedBlueprint({
    id: "salesforce_records",
    title: "Salesforce records",
    vendor: "Salesforce",
    brand: "#00a1e0",
    category: "crm",
    icon: UsersIcon,
    summary:
      "Read and update Accounts, Contacts and Cases through a connected app.",
    tags: ["OAuth", "Enterprise"],
    effect: "read",
    highlights: [
      "Needs a connected app and per-org instance URL, which the endpoint field cannot hold yet.",
      "SOQL support so a lookup can span related objects in one call.",
    ],
  }),
  plannedBlueprint({
    id: "servicenow_incident",
    title: "ServiceNow incident",
    vendor: "ServiceNow",
    brand: "#62d84e",
    category: "crm",
    icon: RefreshCcwIcon,
    summary:
      "File and track incidents on the ITSM instance your internal helpdesk already runs.",
    tags: ["ITSM", "Enterprise"],
    effect: "write",
    highlights: [
      "Instance-scoped endpoints plus OAuth, so it needs the credential vault first.",
      "Assignment groups and categories mapped from the conversation.",
    ],
  }),
]
