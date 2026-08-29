import {
  CloudCogIcon,
  GitPullRequestArrowIcon,
  PlugZapIcon,
  RadioTowerIcon,
  ShuffleIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import {
  bearerAuth,
  headerAuth,
  opt,
  p,
  plannedBlueprint,
  restBlueprint,
  secretUrlAuth,
} from "./helpers"
import type { ToolBlueprint } from "./types"

/** Hand the work to a platform that already knows how to finish it. */
export const automationBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "zapier_trigger",
    title: "Zapier trigger",
    vendor: "Zapier",
    brand: "#ff4f00",
    category: "automation",
    icon: ZapIcon,
    tone: "critical",
    effect: "write",
    featured: true,
    summary:
      "Start a Zap with the fields the assistant collected and let Zapier fan out to the rest.",
    tags: ["Catch hook", "No-code"],
    highlights: [
      "One tool reaches every app Zapier connects to, without a blueprint per vendor.",
      "The Zap owns the credentials for downstream apps, so nothing else is stored here.",
      "Add fields by adding parameters — the payload is just the arguments as JSON.",
    ],
    auth: secretUrlAuth(
      "Catch hook URL",
      "The hook URL is the credential — regenerate the Zap to rotate it."
    ),
    hostHints: ["hooks.zapier.com"],
    endpointPlaceholder: "https://hooks.zapier.com/hooks/catch/000000/xxxxxxx",
    docsUrl: "https://help.zapier.com/hc/en-us/articles/8496288690317",
    setupHint:
      "Create a Zap with the Webhooks by Zapier catch hook trigger and paste its URL.",
    transport: "custom_webhook",
    voice: true,
    tool: {
      name: "trigger_zap",
      description:
        "Send the collected details to Zapier so the rest of the workflow can run.",
      method: "POST",
      parameters: [
        p("summary", "What the assistant is handing off."),
        opt("email", "Customer email address, when it is known."),
        opt("reference", "Order id, ticket id or other reference."),
      ],
    },
  }),
  restBlueprint({
    id: "make_trigger",
    title: "Make scenario",
    vendor: "Make",
    brand: "#6d00cc",
    category: "automation",
    icon: WorkflowIcon,
    tone: "accent",
    effect: "write",
    summary:
      "Kick off a Make scenario with the conversation's data as its payload.",
    tags: ["Custom webhook", "No-code"],
    highlights: [
      "Make's webhook module infers the payload shape from the first call it receives.",
      "Scenario runs are logged in Make, which is where you debug a failed handoff.",
    ],
    auth: secretUrlAuth(
      "Scenario webhook URL",
      "Anyone with the URL can start the scenario."
    ),
    hostHints: ["hook.make.com", "hook.integromat.com"],
    endpointPlaceholder: "https://hook.make.com/xxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://www.make.com/en/help/tools/webhooks",
    setupHint:
      "Add a custom webhook module in Make and paste its address here.",
    transport: "custom_webhook",
    tool: {
      name: "trigger_make_scenario",
      description: "Start the Make scenario that handles this kind of request.",
      method: "POST",
      parameters: [
        p("summary", "What the assistant is handing off."),
        opt("email", "Customer email address, when it is known."),
      ],
    },
  }),
  restBlueprint({
    id: "n8n_workflow",
    title: "n8n workflow",
    vendor: "n8n",
    brand: "#ea4b71",
    category: "automation",
    icon: ShuffleIcon,
    tone: "critical",
    effect: "write",
    summary:
      "Call a workflow on your own n8n instance — self-hosted automation, no third party in the path.",
    tags: ["Webhook", "Self-hosted"],
    highlights: [
      "Works against self-hosted n8n as long as the endpoint is reachable over https.",
      "Add a header credential in n8n and the same header here to authenticate the call.",
    ],
    auth: headerAuth(
      "X-N8N-Api-Key",
      "Workflow header credential",
      "Optional — set a header auth credential on the n8n webhook node."
    ),
    hostHints: ["/webhook/", "n8n.cloud"],
    endpointPlaceholder: "https://n8n.yourcompany.com/webhook/assistant-tool",
    docsUrl:
      "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/",
    setupHint:
      "Use the production webhook URL, not the test one — test URLs stop listening.",
    transport: "custom_webhook",
    tool: {
      name: "run_n8n_workflow",
      description: "Run the n8n workflow that handles this request.",
      method: "POST",
      parameters: [
        p("summary", "What the assistant is handing off."),
        opt("reference", "Any id the workflow needs to act on."),
      ],
    },
  }),
  restBlueprint({
    id: "pipedream_workflow",
    title: "Pipedream workflow",
    vendor: "Pipedream",
    brand: "#42d888",
    category: "automation",
    icon: PlugZapIcon,
    tone: "positive",
    effect: "write",
    summary:
      "Trigger a code-first workflow when the logic is more than a no-code branch can hold.",
    tags: ["HTTP trigger", "Code"],
    highlights: [
      "Full Node.js or Python in the workflow, so the transformation happens outside the prompt.",
      "Per-workflow URLs make it easy to retire one integration without touching the others.",
    ],
    auth: secretUrlAuth(
      "Workflow trigger URL",
      "Each workflow gets its own endpoint."
    ),
    hostHints: ["m.pipedream.net"],
    endpointPlaceholder: "https://xxxxxxxxxxxx.m.pipedream.net",
    docsUrl: "https://pipedream.com/docs/workflows/triggers/",
    setupHint: "Use the workflow's HTTP trigger URL from the Pipedream editor.",
    transport: "custom_webhook",
    tool: {
      name: "run_pipedream_workflow",
      description: "Trigger the Pipedream workflow for this request.",
      method: "POST",
      parameters: [
        p("summary", "What the assistant is handing off."),
        opt("payload", "Any extra JSON-encoded context the workflow expects."),
      ],
    },
  }),
  restBlueprint({
    id: "retool_workflow",
    title: "Retool workflow",
    vendor: "Retool",
    brand: "#3c3c3c",
    category: "automation",
    icon: CloudCogIcon,
    tone: "neutral",
    effect: "write",
    summary:
      "Run an internal workflow that already has database and API access your team trusts.",
    tags: ["Internal tools", "API key"],
    highlights: [
      "Reuses the resource connections Retool already holds, so no new credentials are copied here.",
      "Workflow runs are audited in Retool, which is usually what compliance asks for.",
    ],
    auth: headerAuth(
      "X-Workflow-Api-Key",
      "Workflow API key",
      "Generated on the workflow's Trigger panel.",
      "https://docs.retool.com/workflows/guides/triggers/webhook"
    ),
    hostHints: ["api.retool.com", "retool.com/v1/workflows"],
    endpointPlaceholder:
      "https://api.retool.com/v1/workflows/<workflow-id>/startTrigger",
    docsUrl: "https://docs.retool.com/workflows/guides/triggers/webhook",
    setupHint:
      "Copy the workflow id into the endpoint and its API key into the credential field.",
    tool: {
      name: "run_retool_workflow",
      description: "Start the internal Retool workflow for this request.",
      method: "POST",
      headers: { "X-Workflow-Api-Key": "retool_wk_your_key" },
      body: { summary: "{{summary}}", reference: "{{reference}}" },
      parameters: [
        p("summary", "What the workflow should act on."),
        opt("reference", "Record id the workflow needs."),
      ],
    },
  }),
  restBlueprint({
    id: "power_automate_flow",
    title: "Power Automate flow",
    vendor: "Microsoft",
    brand: "#0066ff",
    category: "automation",
    icon: RadioTowerIcon,
    tone: "info",
    effect: "write",
    summary:
      "Start a flow inside your Microsoft tenant — SharePoint, Dataverse, Outlook and the rest.",
    tags: ["HTTP trigger", "Microsoft 365"],
    highlights: [
      "The flow runs as its owner, so tenant policies and DLP rules still apply.",
      "The signature in the trigger URL is the credential — rotate by regenerating the trigger.",
    ],
    auth: secretUrlAuth(
      "HTTP trigger URL",
      "Contains a shared access signature — keep it secret."
    ),
    hostHints: ["logic.azure.com"],
    endpointPlaceholder:
      "https://prod-00.westus.logic.azure.com:443/workflows/…/triggers/manual/paths/invoke",
    docsUrl:
      "https://learn.microsoft.com/en-us/power-automate/desktop-flows/desktop-flow-actions-reference",
    setupHint:
      'Build the flow with a "When an HTTP request is received" trigger and paste its URL.',
    transport: "custom_webhook",
    tool: {
      name: "run_power_automate_flow",
      description: "Start the Power Automate flow that handles this request.",
      method: "POST",
      parameters: [
        p("summary", "What the flow should act on."),
        opt("email", "Customer email address, when it is known."),
      ],
    },
  }),
  restBlueprint({
    id: "github_dispatch",
    title: "GitHub workflow dispatch",
    vendor: "GitHub",
    brand: "#8b8b8b",
    category: "automation",
    icon: GitPullRequestArrowIcon,
    tone: "neutral",
    effect: "write",
    summary:
      "Fire a repository dispatch so an engineering workflow picks the request up in CI.",
    tags: ["Actions", "Fine-grained token"],
    highlights: [
      "A fine-grained token can be scoped to one repository and the contents permission alone.",
      "The event type routes to a specific workflow, so one token cannot start everything.",
    ],
    auth: bearerAuth(
      "Fine-grained access token",
      "Scope it to the single repository with contents: write.",
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
    ),
    hostHints: ["api.github.com"],
    endpointPlaceholder:
      "https://api.github.com/repos/your-org/your-repo/dispatches",
    docsUrl:
      "https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event",
    setupHint:
      "Put your org and repo in the endpoint, and handle the event type in a workflow file.",
    tool: {
      name: "dispatch_github_workflow",
      description:
        "Trigger the engineering workflow that handles this kind of customer report.",
      method: "POST",
      headers: {
        Authorization: "Bearer github_pat_your_token",
        Accept: "application/vnd.github+json",
      },
      body: {
        event_type: "assistant-request",
        client_payload: { summary: "{{summary}}", reference: "{{reference}}" },
      },
      parameters: [
        p("summary", "What the workflow should act on."),
        opt("reference", "Ticket, order or issue reference."),
      ],
    },
  }),
  plannedBlueprint({
    id: "aws_lambda",
    title: "AWS Lambda",
    vendor: "Amazon Web Services",
    brand: "#ff9900",
    category: "automation",
    icon: CloudCogIcon,
    summary:
      "Invoke a function directly with SigV4 signing instead of fronting it with an API gateway.",
    tags: ["SigV4", "Serverless"],
    effect: "write",
    highlights: [
      "Request signing has to happen server-side, which needs the credential vault.",
      "Until then, front the function with a Function URL and use the REST action blueprint.",
    ],
  }),
]
