import {
  BracesIcon,
  FileJson2Icon,
  KeyRoundIcon,
  ServerCogIcon,
  SquareTerminalIcon,
  WebhookIcon,
} from "lucide-react"

import {
  bearerAuth,
  noAuth,
  opt,
  p,
  plannedBlueprint,
  restBlueprint,
  secretUrlAuth,
} from "./helpers"
import type { ToolBlueprint } from "./types"

/** The escape hatches — anything with an HTTP endpoint. */
export const customBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "rest_lookup",
    title: "REST lookup",
    vendor: "Any HTTP API",
    brand: "#64748b",
    category: "custom",
    icon: ServerCogIcon,
    tone: "neutral",
    effect: "read",
    featured: true,
    summary:
      "Read from any internal service — every parameter is appended to the URL as a query string.",
    tags: ["GET", "Read-only"],
    highlights: [
      "Start here for internal APIs: point at the endpoint, name the parameters, done.",
      "GET calls carry no body, so there is no template to keep in sync.",
      "Outbound requests are fenced to public https hosts, redirects included.",
    ],
    auth: bearerAuth(
      "Bearer token",
      "Optional — leave the credential blank for an open endpoint."
    ),
    endpointPlaceholder: "https://api.internal.example.com/v1/customers",
    setupHint:
      "Each parameter becomes a query string value, so name them the way your API expects.",
    tool: {
      name: "lookup_record",
      description:
        "Look up a record in the internal service by the identifier the customer gives.",
      method: "GET",
      parameters: [p("id", "Identifier to look the record up by.")],
    },
  }),
  restBlueprint({
    id: "rest_action",
    title: "REST action",
    vendor: "Any HTTP API",
    brand: "#64748b",
    category: "custom",
    icon: SquareTerminalIcon,
    tone: "neutral",
    effect: "write",
    summary:
      "Post a JSON body you shape yourself, with placeholders for whatever the model collected.",
    tags: ["POST", "Body template"],
    highlights: [
      "The body template is the contract — the model fills placeholders, it never designs the payload.",
      "Leave the template empty to post the raw arguments as a flat JSON object.",
      "Bearer, basic and custom header credentials are all masked in the editor.",
    ],
    auth: bearerAuth(
      "Bearer token",
      "Optional — swap to a custom header if your API expects one."
    ),
    endpointPlaceholder: "https://api.internal.example.com/v1/tickets",
    setupHint:
      "Use {{parameter_name}} anywhere in the body template to place an argument.",
    tool: {
      name: "create_record",
      description:
        "Create a record in the internal service from the details collected in the conversation.",
      method: "POST",
      body: { title: "{{title}}", details: "{{details}}" },
      parameters: [
        p("title", "Short title for the record."),
        p("details", "Everything worth recording about the request."),
      ],
    },
  }),
  restBlueprint({
    id: "graphql_query",
    title: "GraphQL operation",
    vendor: "Any GraphQL API",
    brand: "#e10098",
    category: "custom",
    icon: BracesIcon,
    tone: "accent",
    effect: "read",
    summary:
      "Send a fixed query or mutation with variables, so the model chooses values and never the shape.",
    tags: ["GraphQL", "Variables"],
    highlights: [
      "The operation is pinned in the template; only the variables interpolate.",
      "One endpoint covers reads and writes, which suits internal APIs behind a gateway.",
    ],
    auth: bearerAuth("Bearer token", "However your gateway authenticates."),
    endpointPlaceholder: "https://api.internal.example.com/graphql",
    setupHint:
      "Replace the query string with your operation, and map each variable to a parameter.",
    tool: {
      name: "query_graphql",
      description: "Run the stored GraphQL operation with the given variables.",
      method: "POST",
      body: {
        query: "query($id:ID!){ record(id:$id){ id status updatedAt } }",
        variables: { id: "{{id}}" },
      },
      parameters: [p("id", "Identifier to pass as the query variable.")],
    },
  }),
  restBlueprint({
    id: "custom_webhook",
    title: "Custom webhook",
    vendor: "Your endpoint",
    brand: "#64748b",
    category: "custom",
    icon: WebhookIcon,
    tone: "neutral",
    effect: "notify",
    summary:
      "The simplest possible contract: your arguments arrive as flat JSON on one URL.",
    tags: ["POST", "No template"],
    highlights: [
      "No headers, no body template — add a parameter and it appears in the payload.",
      "Good for a first integration you intend to replace with a typed one later.",
    ],
    auth: secretUrlAuth(
      "Endpoint URL",
      "Include a secret path segment or query token if the endpoint is public."
    ),
    endpointPlaceholder: "https://hooks.example.com/assistant-tool",
    setupHint:
      "Every parameter you add is delivered as a top-level key in the JSON body.",
    transport: "custom_webhook",
    tool: {
      name: "call_custom_endpoint",
      description:
        "Send the collected details to the team's endpoint for processing.",
      method: "POST",
      parameters: [
        p("summary", "What the assistant is sending over."),
        opt("reference", "Any identifier the endpoint needs."),
      ],
    },
  }),
  restBlueprint({
    id: "status_page_check",
    title: "Status page check",
    vendor: "Statuspage · Better Stack",
    brand: "#2a78d6",
    category: "custom",
    icon: FileJson2Icon,
    tone: "info",
    effect: "read",
    summary:
      'Read your own public status endpoint so "is it down?" is answered from fact, not guesswork.',
    tags: ["GET", "Public", "Read-only"],
    highlights: [
      "Most status pages expose summary.json publicly, so no credential is needed.",
      "Stops the assistant from denying an incident that is already declared.",
    ],
    auth: noAuth("Public status endpoints need no credential."),
    endpointPlaceholder: "https://status.yourcompany.com/api/v2/summary.json",
    docsUrl: "https://developer.statuspage.io/",
    setupHint:
      "Point at your status page's summary.json — no parameters are needed.",
    voice: true,
    tool: {
      name: "check_service_status",
      description:
        "Check the public status page for ongoing incidents before answering an outage question.",
      method: "GET",
      parameters: [],
    },
  }),
  plannedBlueprint({
    id: "openapi_import",
    title: "OpenAPI import",
    vendor: "Any specification",
    brand: "#6ba539",
    category: "custom",
    icon: FileJson2Icon,
    summary:
      "Paste a spec, pick the operations to expose, and get typed tools with parameters filled in.",
    tags: ["OpenAPI", "Bulk"],
    effect: "read",
    highlights: [
      "Parameters, descriptions and body templates generated from the schema.",
      "Re-import to pick up API changes instead of hand-editing each tool.",
    ],
  }),
  plannedBlueprint({
    id: "mcp_server",
    title: "MCP servers",
    vendor: "Model Context Protocol",
    brand: "#a855f7",
    category: "custom",
    icon: ServerCogIcon,
    summary:
      "Connect an MCP server and expose its tools to the assistant without wiring each one by hand.",
    tags: ["MCP", "Bulk"],
    effect: "read",
    highlights: [
      "One connection publishes every tool the server advertises.",
      "Tool definitions stay in sync with the server instead of being copied here.",
    ],
  }),
  plannedBlueprint({
    id: "signed_requests",
    title: "Signed requests",
    vendor: "HMAC · mTLS",
    brand: "#6b7280",
    category: "custom",
    icon: KeyRoundIcon,
    summary:
      "Prove the call came from your workspace with a request signature or a client certificate.",
    tags: ["Security", "Enterprise"],
    effect: "read",
    highlights: [
      "HMAC signing over the body with a rotating shared secret.",
      "Client certificates for endpoints that will not accept bearer tokens.",
    ],
  }),
]
