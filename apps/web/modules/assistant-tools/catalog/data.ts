import {
  DatabaseZapIcon,
  FileStackIcon,
  GridIcon,
  LayersIcon,
  NotebookPenIcon,
  RowsIcon,
  SearchIcon,
  ServerIcon,
  TableIcon,
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

/** Structured records outside the spreadsheet — bases, wikis and databases. */
export const dataBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "airtable_search_records",
    title: "Airtable record lookup",
    vendor: "Airtable",
    brand: "#fcb400",
    category: "data",
    icon: SearchIcon,
    tone: "warning",
    effect: "read",
    summary:
      "Find a record in a base by email, order id or any field, using a formula you control.",
    tags: ["Base", "Formula", "Read-only"],
    highlights: [
      "The filter formula lives in the template, so the model supplies a value and never a query.",
      "maxRecords caps what comes back, keeping the reply inside the response budget.",
      "A personal access token scoped to one base is enough.",
    ],
    auth: bearerAuth(
      "Personal access token",
      "Create one at airtable.com/create/tokens with data.records:read on the base.",
      "https://airtable.com/create/tokens"
    ),
    hostHints: ["api.airtable.com"],
    endpointPlaceholder:
      "https://api.airtable.com/v0/appXXXXXXXXXXXXXX/tblXXXXXXXXXXXXXX/listRecords",
    docsUrl: "https://airtable.com/developers/web/api/list-records",
    setupHint:
      "Put your base and table ids in the endpoint, then edit the formula to match your field names.",
    tool: {
      name: "lookup_airtable_record",
      description:
        "Look up a record in the Airtable base by the customer's email address.",
      method: "POST",
      headers: { Authorization: "Bearer patXXXXXXXXXXXXXX" },
      body: {
        filterByFormula: "{Email} = '{{email}}'",
        maxRecords: 3,
      },
      parameters: [p("email", "Email address to search the base for.")],
    },
  }),
  restBlueprint({
    id: "airtable_add_record",
    title: "Airtable record create",
    vendor: "Airtable",
    brand: "#fcb400",
    category: "data",
    icon: RowsIcon,
    tone: "warning",
    effect: "write",
    summary:
      "Log a request, a lead or a booking into the base your operations team already works from.",
    tags: ["Base", "Write"],
    highlights: [
      "Field names in the template are the contract — a renamed column fails loudly instead of writing junk.",
      "typecast lets Airtable coerce a select option it recognises.",
    ],
    auth: bearerAuth(
      "Personal access token",
      "Needs data.records:write on the base.",
      "https://airtable.com/create/tokens"
    ),
    hostHints: ["api.airtable.com"],
    endpointPlaceholder:
      "https://api.airtable.com/v0/appXXXXXXXXXXXXXX/tblXXXXXXXXXXXXXX",
    docsUrl: "https://airtable.com/developers/web/api/create-records",
    setupHint:
      "Match the field names in the body template to the columns in your table.",
    tool: {
      name: "add_airtable_record",
      description:
        "Add a record to the Airtable base with the details captured in the conversation.",
      method: "POST",
      headers: { Authorization: "Bearer patXXXXXXXXXXXXXX" },
      body: {
        fields: {
          Name: "{{name}}",
          Email: "{{email}}",
          Notes: "{{notes}}",
        },
        typecast: true,
      },
      parameters: [
        p("name", "Name to record."),
        p("email", "Email address to record."),
        opt("notes", "Any extra context worth keeping on the record."),
      ],
    },
  }),
  restBlueprint({
    id: "notion_query_database",
    title: "Notion database query",
    vendor: "Notion",
    brand: "#8b8b8b",
    category: "data",
    icon: FileStackIcon,
    tone: "neutral",
    effect: "read",
    summary:
      "Search an internal wiki database — policies, inventory, FAQs — with a filter you define.",
    tags: ["Wiki", "Filter", "Read-only"],
    highlights: [
      "The integration only sees databases you explicitly share with it.",
      "Filter shape is fixed in the template, so the model cannot widen the query.",
    ],
    auth: bearerAuth(
      "Internal integration secret",
      "Starts with ntn_ or secret_ — from notion.so/my-integrations.",
      "https://developers.notion.com/docs/authorization"
    ),
    hostHints: ["api.notion.com"],
    endpointPlaceholder:
      "https://api.notion.com/v1/databases/<database-id>/query",
    docsUrl: "https://developers.notion.com/reference/post-database-query",
    setupHint:
      "Share the database with your integration, then put its id in the endpoint.",
    tool: {
      name: "search_notion_database",
      description:
        "Search the internal Notion database for an entry matching the customer's question.",
      method: "POST",
      headers: {
        Authorization: "Bearer ntn_your_secret",
        "Notion-Version": "2022-06-28",
      },
      body: {
        filter: {
          property: "Name",
          title: { contains: "{{query}}" },
        },
        page_size: 3,
      },
      parameters: [p("query", "Words to search the database titles for.")],
    },
  }),
  restBlueprint({
    id: "notion_page",
    title: "Notion page create",
    vendor: "Notion",
    brand: "#8b8b8b",
    category: "data",
    icon: NotebookPenIcon,
    tone: "neutral",
    effect: "write",
    summary:
      "File a structured note into a Notion database — feedback, bug reports, call summaries.",
    tags: ["Wiki", "Write"],
    highlights: [
      "Writes a real database row, so views and filters in Notion pick it up immediately.",
      "The property names in the template must match the database schema exactly.",
    ],
    auth: bearerAuth(
      "Internal integration secret",
      "The integration must be shared into the target database.",
      "https://developers.notion.com/docs/authorization"
    ),
    hostHints: ["api.notion.com"],
    endpoint: "https://api.notion.com/v1/pages",
    endpointPlaceholder: "https://api.notion.com/v1/pages",
    docsUrl: "https://developers.notion.com/reference/post-page",
    setupHint:
      "Put your database id in the body template and share the database with the integration.",
    tool: {
      name: "create_notion_entry",
      description:
        "Create an entry in the team's Notion database summarising the conversation.",
      method: "POST",
      headers: {
        Authorization: "Bearer ntn_your_secret",
        "Notion-Version": "2022-06-28",
      },
      body: {
        parent: { database_id: "your-database-id" },
        properties: {
          Name: { title: [{ text: { content: "{{title}}" } }] },
          Notes: { rich_text: [{ text: { content: "{{summary}}" } }] },
        },
      },
      parameters: [
        p("title", "Short title for the entry."),
        p("summary", "Summary of what the customer reported or asked for."),
      ],
    },
  }),
  restBlueprint({
    id: "supabase_rpc_lookup",
    title: "Supabase function call",
    vendor: "Supabase",
    brand: "#3ecf8e",
    category: "data",
    icon: DatabaseZapIcon,
    tone: "positive",
    effect: "read",
    featured: true,
    summary:
      "Call a Postgres function you wrote, so the assistant queries your database on your terms.",
    tags: ["Postgres", "RPC", "Read-only"],
    highlights: [
      "The function is the interface: row-level security and shaping stay in the database.",
      "No table access is granted — the assistant can only call what you exposed.",
      "Use the anon key with RLS, or a service key when the function is security definer.",
    ],
    auth: bearerAuth(
      "Project API key",
      "Settings → API. Prefer the anon key with row-level security enabled.",
      "https://supabase.com/docs/guides/api/api-keys"
    ),
    hostHints: ["supabase.co/rest"],
    endpointPlaceholder:
      "https://your-project.supabase.co/rest/v1/rpc/lookup_customer",
    docsUrl: "https://supabase.com/docs/guides/database/functions",
    setupHint:
      "Create the Postgres function first, then point the endpoint at /rest/v1/rpc/<function-name>.",
    tool: {
      name: "lookup_customer_record",
      description:
        "Call the database function that returns a customer's record from their email address.",
      method: "POST",
      headers: {
        apikey: "your-anon-key",
        Authorization: "Bearer your-anon-key",
      },
      body: { email: "{{email}}" },
      parameters: [p("email", "Email address to look the customer up by.")],
    },
  }),
  restBlueprint({
    id: "supabase_insert_row",
    title: "Supabase row insert",
    vendor: "Supabase",
    brand: "#3ecf8e",
    category: "data",
    icon: TableIcon,
    tone: "positive",
    effect: "write",
    summary:
      "Insert straight into a table through PostgREST, with row-level security still enforced.",
    tags: ["Postgres", "REST", "Write"],
    highlights: [
      "Row-level security policies apply to the key you paste — the tool cannot bypass them.",
      "Prefer: return=representation sends the inserted row back so the assistant can confirm it.",
    ],
    auth: bearerAuth(
      "Project API key",
      "Use a key whose RLS policy allows exactly this insert.",
      "https://supabase.com/docs/guides/api/api-keys"
    ),
    hostHints: ["supabase.co/rest"],
    endpointPlaceholder:
      "https://your-project.supabase.co/rest/v1/support_requests",
    docsUrl: "https://supabase.com/docs/guides/api",
    setupHint:
      "Point the endpoint at /rest/v1/<table> and match the body keys to your columns.",
    tool: {
      name: "insert_supabase_row",
      description:
        "Insert a row into the table recording what the customer asked for.",
      method: "POST",
      headers: {
        apikey: "your-anon-key",
        Authorization: "Bearer your-anon-key",
        Prefer: "return=representation",
      },
      body: { email: "{{email}}", note: "{{note}}" },
      parameters: [
        p("email", "Email address of the customer."),
        p("note", "What to record against them."),
      ],
    },
  }),
  restBlueprint({
    id: "smartsheet_search",
    title: "Smartsheet search",
    vendor: "Smartsheet",
    brand: "#0f4f8b",
    category: "data",
    icon: GridIcon,
    tone: "info",
    effect: "read",
    summary:
      "Search sheets your operations team maintains without giving the assistant edit rights.",
    tags: ["Sheets", "Search", "Read-only"],
    highlights: [
      "Searches everything the token's user can see, so sharing controls still hold.",
      "Returns the matching rows' context rather than a whole sheet.",
    ],
    auth: bearerAuth(
      "API access token",
      "Generated from Personal Settings → API Access.",
      "https://smartsheet.redoc.ly/#section/API-Basics/Authentication"
    ),
    hostHints: ["api.smartsheet.com"],
    endpoint: "https://api.smartsheet.com/2.0/search",
    endpointPlaceholder: "https://api.smartsheet.com/2.0/search",
    docsUrl: "https://smartsheet.redoc.ly/tag/search",
    setupHint:
      "Scope the token to a workspace so the assistant cannot search the whole account.",
    tool: {
      name: "search_smartsheet",
      description: "Search Smartsheet for rows matching the customer's query.",
      method: "GET",
      headers: { Authorization: "Bearer your-smartsheet-token" },
      parameters: [p("query", "Text to search the sheets for.")],
    },
  }),
  restBlueprint({
    id: "elastic_search_query",
    title: "Elasticsearch query",
    vendor: "Elastic",
    brand: "#00bfb3",
    category: "data",
    icon: LayersIcon,
    tone: "info",
    effect: "read",
    summary:
      "Search an index you already run — product catalogue, docs, logs — from the conversation.",
    tags: ["Search", "API key", "Read-only"],
    highlights: [
      "The query shape is fixed in the template; the model only supplies the search text.",
      "size caps the hits so a broad match cannot flood the reply.",
      "Works against Elastic Cloud or a self-hosted cluster reachable over https.",
    ],
    auth: headerAuth(
      "Authorization",
      "Elasticsearch API key",
      "Send it as ApiKey <base64-id:key> — created in Kibana under Stack Management.",
      "https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html"
    ),
    hostHints: ["elastic-cloud.com", "found.io"],
    endpointPlaceholder:
      "https://your-cluster.es.us-east-1.aws.found.io/your-index/_search",
    docsUrl:
      "https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html",
    setupHint:
      "Point the endpoint at /<index>/_search and edit the fields list to match your mapping.",
    tool: {
      name: "search_index",
      description:
        "Search the product index for entries matching the customer's question.",
      method: "POST",
      headers: { Authorization: "ApiKey base64-id-colon-key" },
      body: {
        size: 3,
        query: {
          multi_match: {
            query: "{{query}}",
            fields: ["title", "description"],
          },
        },
      },
      parameters: [p("query", "What the customer is looking for.")],
    },
  }),
  plannedBlueprint({
    id: "sql_query",
    title: "SQL query",
    vendor: "Postgres · MySQL",
    brand: "#336791",
    category: "data",
    icon: ServerIcon,
    summary:
      "Run a parameterised, read-only statement against a database you connect once.",
    tags: ["Database", "Read-only"],
    effect: "read",
    highlights: [
      "Statements are stored and parameterised — the model fills placeholders, never writes SQL.",
      "Needs a pooled connection and a credential vault, which is the piece still missing.",
    ],
  }),
  plannedBlueprint({
    id: "warehouse_query",
    title: "Warehouse query",
    vendor: "BigQuery · Snowflake",
    brand: "#29b5e8",
    category: "data",
    icon: DatabaseZapIcon,
    summary:
      "Answer analytics questions from the warehouse with a saved, cost-bounded query.",
    tags: ["Analytics", "Read-only"],
    effect: "read",
    highlights: [
      "Byte and row limits enforced before the query runs.",
      "Results cached per parameter set so repeated questions cost nothing.",
    ],
  }),
]
