import {
  CalendarCheckIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  GitBranchIcon,
  KanbanIcon,
  ListTodoIcon,
  SquareKanbanIcon,
  TicketCheckIcon,
  VideoIcon,
} from "lucide-react"

import {
  bearerAuth,
  headerAuth,
  opt,
  p,
  plannedBlueprint,
  restBlueprint,
} from "./helpers"
import type { ToolBlueprint } from "./types"

/** Where work actually gets tracked once the conversation ends. */
export const productivityBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "jira_issue",
    title: "Jira issue",
    vendor: "Jira",
    brand: "#0052cc",
    category: "productivity",
    icon: TicketCheckIcon,
    tone: "info",
    effect: "write",
    featured: true,
    summary:
      "File a bug or request into the project your engineers already work out of.",
    tags: ["Issue tracking", "Basic auth"],
    highlights: [
      "Project key and issue type are pinned in the template — the assistant only writes the content.",
      "Uses an Atlassian API token, so no user password is stored.",
      "Description is sent in Atlassian document format, which is what the v3 API expects.",
    ],
    auth: {
      kind: "basic",
      label: "Atlassian email and API token",
      hint: "Base64 of you@example.com:your_api_token.",
      docsUrl:
        "https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/",
    },
    hostHints: ["atlassian.net/rest"],
    endpointPlaceholder: "https://your-domain.atlassian.net/rest/api/3/issue",
    docsUrl:
      "https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post",
    setupHint:
      "Swap your-domain for your Atlassian site and set the project key in the body template.",
    tool: {
      name: "create_jira_issue",
      description:
        "File a Jira issue for a bug or request the assistant could not resolve.",
      method: "POST",
      headers: { Authorization: "Basic BASE64_OF_EMAIL_COLON_TOKEN" },
      body: {
        fields: {
          project: { key: "SUP" },
          issuetype: { name: "Task" },
          summary: "{{summary}}",
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "{{description}}" }],
              },
            ],
          },
        },
      },
      parameters: [
        p("summary", "One-line summary of the issue."),
        p("description", "Full description, including steps and context."),
      ],
    },
  }),
  restBlueprint({
    id: "linear_issue",
    title: "Linear issue",
    vendor: "Linear",
    brand: "#5e6ad2",
    category: "productivity",
    icon: GitBranchIcon,
    tone: "accent",
    effect: "write",
    summary:
      "Create an issue in the team's Linear workspace straight from a customer report.",
    tags: ["Issue tracking", "GraphQL"],
    highlights: [
      "One GraphQL mutation, so there is no REST resource shape to keep in sync.",
      "The team id in the template decides which board it lands on.",
      "Personal API keys are sent raw, without a Bearer prefix — the template already does this.",
    ],
    auth: headerAuth(
      "Authorization",
      "Linear API key",
      "Settings → API → Personal API keys. Send it raw, with no Bearer prefix.",
      "https://developers.linear.app/docs/graphql/working-with-the-graphql-api"
    ),
    hostHints: ["api.linear.app"],
    endpoint: "https://api.linear.app/graphql",
    endpointPlaceholder: "https://api.linear.app/graphql",
    docsUrl:
      "https://developers.linear.app/docs/graphql/working-with-the-graphql-api",
    setupHint:
      "Replace the teamId in the body template with the team the issues should land in.",
    tool: {
      name: "create_linear_issue",
      description:
        "Create a Linear issue describing a bug or feature request from the conversation.",
      method: "POST",
      headers: { Authorization: "lin_api_your_key" },
      body: {
        query:
          'mutation($title:String!,$description:String!){issueCreate(input:{teamId:"your-team-id",title:$title,description:$description}){success issue{identifier url}}}',
        variables: { title: "{{title}}", description: "{{description}}" },
      },
      parameters: [
        p("title", "Short title for the issue."),
        p(
          "description",
          "What happened, in the customer's words plus context."
        ),
      ],
    },
  }),
  restBlueprint({
    id: "asana_task",
    title: "Asana task",
    vendor: "Asana",
    brand: "#f06a6a",
    category: "productivity",
    icon: CheckSquareIcon,
    tone: "critical",
    effect: "write",
    summary: "Drop a follow-up into the project your team runs its week from.",
    tags: ["Tasks", "Bearer"],
    highlights: [
      "Lands in a specific project, so it appears on the board rather than in someone's inbox.",
      "Due dates can be passed through as a parameter when the customer names one.",
    ],
    auth: bearerAuth(
      "Personal access token",
      "Created under My Settings → Apps → Manage developer apps.",
      "https://developers.asana.com/docs/personal-access-token"
    ),
    hostHints: ["app.asana.com/api"],
    endpoint: "https://app.asana.com/api/1.0/tasks",
    endpointPlaceholder: "https://app.asana.com/api/1.0/tasks",
    docsUrl: "https://developers.asana.com/reference/createtask",
    setupHint:
      "Put your workspace and project ids in the body template before saving.",
    tool: {
      name: "create_asana_task",
      description:
        "Create an Asana task for follow-up work the conversation generated.",
      method: "POST",
      headers: { Authorization: "Bearer 1/your-personal-access-token" },
      body: {
        data: {
          workspace: "your-workspace-id",
          projects: ["your-project-id"],
          name: "{{name}}",
          notes: "{{notes}}",
          due_on: "{{due_on}}",
        },
      },
      parameters: [
        p("name", "Task title."),
        p("notes", "Context for whoever picks the task up."),
        opt("due_on", "Due date in YYYY-MM-DD, when the customer named one."),
      ],
    },
  }),
  restBlueprint({
    id: "clickup_task",
    title: "ClickUp task",
    vendor: "ClickUp",
    brand: "#7b68ee",
    category: "productivity",
    icon: ClipboardListIcon,
    tone: "accent",
    effect: "write",
    summary:
      "Create a task in a specific list, with priority mapped from how urgent the customer sounds.",
    tags: ["Tasks", "API token"],
    highlights: [
      "The list id in the endpoint pins where tasks land.",
      "Priority is 1–4, urgent through low, so escalation survives the handoff.",
    ],
    auth: headerAuth(
      "Authorization",
      "ClickUp API token",
      "Settings → Apps → API token. Sent raw, with no Bearer prefix.",
      "https://clickup.com/api/developer-portal/authentication/"
    ),
    hostHints: ["api.clickup.com"],
    endpointPlaceholder: "https://api.clickup.com/api/v2/list/<list-id>/task",
    docsUrl: "https://clickup.com/api/clickupreference/operation/CreateTask/",
    setupHint: "Put the destination list id into the endpoint before saving.",
    tool: {
      name: "create_clickup_task",
      description: "Create a ClickUp task for work raised in the conversation.",
      method: "POST",
      headers: { Authorization: "pk_your_api_token" },
      body: {
        name: "{{name}}",
        description: "{{description}}",
        priority: 3,
      },
      parameters: [
        p("name", "Task title."),
        p("description", "What needs doing and why."),
      ],
    },
  }),
  restBlueprint({
    id: "trello_card",
    title: "Trello card",
    vendor: "Trello",
    brand: "#0079bf",
    category: "productivity",
    icon: KanbanIcon,
    tone: "info",
    effect: "write",
    summary:
      "Add a card to the board a small team triages from, no project tool required.",
    tags: ["Board", "API key"],
    highlights: [
      "Key and token ride in the endpoint, so there is no header to configure.",
      "The list id decides the column, which is usually an intake or triage lane.",
    ],
    auth: {
      kind: "query",
      label: "API key and token in the endpoint",
      hint: "Append ?key=…&token=… to the URL.",
      docsUrl:
        "https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/",
    },
    hostHints: ["api.trello.com"],
    endpointPlaceholder:
      "https://api.trello.com/1/cards?key=your_key&token=your_token",
    docsUrl:
      "https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post",
    setupHint:
      "Append your key and token to the endpoint and set the target list id in the body.",
    tool: {
      name: "create_trello_card",
      description: "Add a Trello card to the team's triage list.",
      method: "POST",
      body: {
        idList: "your-list-id",
        name: "{{name}}",
        desc: "{{description}}",
      },
      parameters: [
        p("name", "Card title."),
        p("description", "Context to put on the back of the card."),
      ],
    },
  }),
  restBlueprint({
    id: "monday_item",
    title: "monday.com item",
    vendor: "monday.com",
    brand: "#ff3d57",
    category: "productivity",
    icon: SquareKanbanIcon,
    tone: "critical",
    effect: "write",
    summary:
      "Create a board item so the request enters the workflow your ops team manages.",
    tags: ["Board", "GraphQL"],
    highlights: [
      "One GraphQL mutation against the board id you pin in the template.",
      "Column values can be extended to carry status, owner or priority.",
    ],
    auth: headerAuth(
      "Authorization",
      "monday.com API token",
      "Avatar → Developers → My access tokens.",
      "https://developer.monday.com/api-reference/docs/authentication"
    ),
    hostHints: ["api.monday.com"],
    endpoint: "https://api.monday.com/v2",
    endpointPlaceholder: "https://api.monday.com/v2",
    docsUrl: "https://developer.monday.com/api-reference/reference/items",
    setupHint:
      "Replace the board id in the mutation with the board items should land on.",
    tool: {
      name: "create_monday_item",
      description: "Create an item on the team's monday.com board.",
      method: "POST",
      headers: {
        Authorization: "your-monday-token",
        "API-Version": "2024-10",
      },
      body: {
        query:
          "mutation($name:String!){create_item(board_id:1234567890,item_name:$name){id}}",
        variables: { name: "{{name}}" },
      },
      parameters: [p("name", "Name of the item to create on the board.")],
    },
  }),
  restBlueprint({
    id: "todoist_task",
    title: "Todoist task",
    vendor: "Todoist",
    brand: "#e44332",
    category: "productivity",
    icon: ListTodoIcon,
    tone: "critical",
    effect: "write",
    summary:
      "Capture a personal follow-up when the team runs on a list rather than a tracker.",
    tags: ["Tasks", "Bearer"],
    highlights: [
      'Natural-language due strings work, so "next Tuesday" schedules correctly.',
      "The project id is optional — leave it out and tasks land in the inbox.",
    ],
    auth: bearerAuth(
      "API token",
      "Settings → Integrations → Developer.",
      "https://developer.todoist.com/rest/v2/#authorization"
    ),
    hostHints: ["api.todoist.com"],
    endpoint: "https://api.todoist.com/rest/v2/tasks",
    endpointPlaceholder: "https://api.todoist.com/rest/v2/tasks",
    docsUrl: "https://developer.todoist.com/rest/v2/#create-a-new-task",
    setupHint: "Add a project_id to the body template to pin the destination.",
    tool: {
      name: "create_todoist_task",
      description: "Add a follow-up task to Todoist.",
      method: "POST",
      headers: { Authorization: "Bearer your-todoist-token" },
      body: { content: "{{content}}", due_string: "{{due_string}}" },
      parameters: [
        p("content", "What the task is."),
        opt(
          "due_string",
          "When it is due, in plain language, e.g. tomorrow 9am."
        ),
      ],
    },
  }),
  restBlueprint({
    id: "calcom_booking",
    title: "Cal.com booking",
    vendor: "Cal.com",
    brand: "#8b8b8b",
    category: "productivity",
    icon: CalendarCheckIcon,
    tone: "neutral",
    effect: "write",
    featured: true,
    summary:
      "Book a real slot on a team calendar while the customer is still in the conversation.",
    tags: ["Scheduling", "Bearer"],
    highlights: [
      "Books against a specific event type, so duration and availability rules still apply.",
      "Double bookings are refused by Cal.com, not by prompt instructions.",
      'Works on voice, where "can you book me in" is the most common request there is.',
    ],
    auth: bearerAuth(
      "Cal.com API key",
      "Starts with cal_live_ — from Settings → Developer → API keys.",
      "https://cal.com/docs/api-reference/v2/introduction"
    ),
    hostHints: ["api.cal.com"],
    endpoint: "https://api.cal.com/v2/bookings",
    endpointPlaceholder: "https://api.cal.com/v2/bookings",
    docsUrl: "https://cal.com/docs/api-reference/v2/bookings/create-a-booking",
    setupHint:
      "Set the event type id and your timezone in the body template before saving.",
    voice: true,
    tool: {
      name: "book_meeting",
      description:
        "Book a meeting slot for the customer at a start time they confirmed.",
      method: "POST",
      headers: {
        Authorization: "Bearer cal_live_your_key",
        "cal-api-version": "2024-08-13",
      },
      body: {
        eventTypeId: 1234567,
        start: "{{start}}",
        attendee: {
          name: "{{name}}",
          email: "{{email}}",
          timeZone: "Europe/London",
        },
      },
      parameters: [
        p("start", "Start time in ISO 8601 UTC, e.g. 2026-09-14T15:00:00Z."),
        p("name", "Name of the person attending."),
        p("email", "Email address to send the invitation to."),
      ],
    },
  }),
  restBlueprint({
    id: "calendly_events",
    title: "Calendly booking lookup",
    vendor: "Calendly",
    brand: "#006bff",
    category: "productivity",
    icon: CalendarClockIcon,
    tone: "info",
    effect: "read",
    summary:
      "Confirm when a customer's meeting is booked instead of asking them to check their inbox.",
    tags: ["Scheduling", "Read-only"],
    highlights: [
      "Filters scheduled events by the invitee's email address.",
      "Read-only: the assistant can confirm a booking but not move it.",
    ],
    auth: bearerAuth(
      "Personal access token",
      "Integrations → API & webhooks → Personal access tokens.",
      "https://developer.calendly.com/getting-started"
    ),
    hostHints: ["api.calendly.com"],
    endpointPlaceholder:
      "https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/XXXX",
    docsUrl:
      "https://developer.calendly.com/api-docs/e2f95ebd44914-list-events",
    setupHint:
      "Put your user or organization URI in the endpoint's query string before saving.",
    tool: {
      name: "lookup_calendly_booking",
      description:
        "Find the customer's upcoming Calendly meeting from their email address.",
      method: "GET",
      headers: { Authorization: "Bearer your-calendly-token" },
      parameters: [
        p("invitee_email", "Email address the meeting was booked under."),
      ],
    },
  }),
  plannedBlueprint({
    id: "calendar_booking",
    title: "Calendar booking",
    vendor: "Google Calendar · Outlook",
    brand: "#4285f4",
    category: "productivity",
    icon: CalendarClockIcon,
    summary:
      "Check real availability and hold a slot on a connected calendar, not a scheduling link.",
    tags: ["OAuth", "Scheduling"],
    effect: "write",
    highlights: [
      "Free/busy lookup before offering times, so the assistant never offers a taken slot.",
      "Needs a per-workspace OAuth grant like the Google Sheets connection.",
    ],
  }),
  plannedBlueprint({
    id: "zoom_meeting",
    title: "Zoom meeting",
    vendor: "Zoom",
    brand: "#0b5cff",
    category: "productivity",
    icon: VideoIcon,
    summary:
      "Create a meeting and hand the customer a join link inside the conversation.",
    tags: ["OAuth", "Meetings"],
    effect: "write",
    highlights: [
      "Server-to-server tokens expire hourly, so this needs the credential vault to refresh them.",
    ],
  }),
]
