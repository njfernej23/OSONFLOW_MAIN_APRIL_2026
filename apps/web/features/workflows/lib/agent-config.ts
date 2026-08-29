import type { IconName } from '../nodes/StepIcon';
import type {
  AgentCapability,
  AgentExitCondition,
  AgentToolKind,
} from './types';

/**
 * Catalogs behind the agent editor.
 *
 * Availability is stated here rather than in the UI so the editor can never
 * offer a tool or a capability the runtime has no way to honour.
 */

export type AssistantToolType =
  | 'query'
  | 'handoff'
  | 'resolve'
  | 'google_sheets'
  | 'api_request'
  | 'custom_webhook';

export type ToolAvailability =
  /** The runtime can call this with nothing else configured. */
  | { status: 'ready' }
  /** Needs a configured assistant tool of one of these types. */
  | { status: 'needsTool'; toolTypes: AssistantToolType[] }
  /** No backend behind it yet. */
  | { status: 'unavailable'; reason: string };

export type AgentToolOption = {
  kind: AgentToolKind;
  label: string;
  icon: IconName;
  description: string;
  availability: ToolAvailability;
};

export const AGENT_TOOLS: AgentToolOption[] = [
  {
    kind: 'api',
    label: 'API',
    icon: 'api',
    description: 'Call an HTTP endpoint and read the response back.',
    availability: {
      status: 'needsTool',
      toolTypes: ['api_request', 'custom_webhook'],
    },
  },
  {
    kind: 'googleSheets',
    label: 'Google Sheets',
    icon: 'library',
    description: 'Look rows up, append them, or update a spreadsheet.',
    availability: { status: 'needsTool', toolTypes: ['google_sheets'] },
  },
  {
    kind: 'function',
    label: 'Function',
    icon: 'function',
    description: 'Run a sandboxed snippet the agent can call mid-turn.',
    availability: {
      status: 'unavailable',
      reason:
        'The JavaScript sandbox runs as its own step today, not as a tool the agent can call.',
    },
  },
  {
    kind: 'mcp',
    label: 'MCP',
    icon: 'component',
    description: 'Connect an MCP server and expose its tools.',
    availability: { status: 'unavailable', reason: 'No MCP client yet.' },
  },
  {
    kind: 'zendesk',
    label: 'Zendesk',
    icon: 'tool',
    description: 'Read and raise Zendesk tickets.',
    availability: { status: 'unavailable', reason: 'No Zendesk integration yet.' },
  },
  {
    kind: 'salesforce',
    label: 'Salesforce',
    icon: 'tool',
    description: 'Read and write Salesforce records.',
    availability: {
      status: 'unavailable',
      reason: 'No Salesforce integration yet.',
    },
  },
  {
    kind: 'shopify',
    label: 'Shopify',
    icon: 'tool',
    description: 'Look up orders, customers and products.',
    availability: { status: 'unavailable', reason: 'No Shopify integration yet.' },
  },
  {
    kind: 'gmail',
    label: 'Gmail',
    icon: 'tool',
    description: 'Send mail from a connected mailbox.',
    availability: { status: 'unavailable', reason: 'No Gmail integration yet.' },
  },
  {
    kind: 'airtable',
    label: 'Airtable',
    icon: 'tool',
    description: 'Read and write Airtable bases.',
    availability: {
      status: 'unavailable',
      reason: 'No Airtable integration yet.',
    },
  },
  {
    kind: 'make',
    label: 'Make',
    icon: 'tool',
    description: 'Trigger a Make scenario.',
    availability: { status: 'unavailable', reason: 'No Make integration yet.' },
  },
  {
    kind: 'twilio',
    label: 'Twilio',
    icon: 'call',
    description: 'Send SMS or place a call.',
    availability: { status: 'unavailable', reason: 'No Twilio integration yet.' },
  },
  {
    kind: 'hubspot',
    label: 'Hubspot',
    icon: 'tool',
    description: 'Read and write Hubspot contacts and deals.',
    availability: {
      status: 'unavailable',
      reason: 'No Hubspot integration yet.',
    },
  },
];

export const agentToolOption = (kind: AgentToolKind) =>
  AGENT_TOOLS.find((tool) => tool.kind === kind);

export type AgentCapabilityOption = {
  id: AgentCapability;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
};

export const AGENT_CAPABILITIES: AgentCapabilityOption[] = [
  {
    id: 'knowledgeBase',
    label: 'Knowledge base',
    description: 'Ground each reply in the organization’s indexed documents.',
    available: true,
  },
  {
    id: 'buttons',
    label: 'Buttons',
    description: 'Let the agent offer quick replies instead of free text.',
    available: true,
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Let the agent answer with a titled card.',
    available: true,
  },
  {
    id: 'carousels',
    label: 'Carousels',
    description: 'Let the agent answer with a row of cards.',
    available: true,
  },
  {
    id: 'callForward',
    label: 'Call forward',
    description: 'Let the agent hand the conversation to a human.',
    available: true,
  },
  {
    id: 'webSearch',
    label: 'Web search',
    description: 'Let the agent search the public web mid-turn.',
    available: false,
    unavailableReason: 'No web search provider is configured for this project.',
  },
  {
    id: 'end',
    label: 'End',
    description: 'Let the agent close the conversation when it is finished.',
    available: true,
  },
];

/** Chat models the deployment can be pointed at. */
export const AGENT_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
];

export const DEFAULT_AGENT_MODEL = 'gpt-4o-mini';

export const agentModelLabel = (model?: string) =>
  AGENT_MODELS.find((entry) => entry.id === (model || DEFAULT_AGENT_MODEL))
    ?.label ?? (model || DEFAULT_AGENT_MODEL);

export type AgentPersona = {
  id: string;
  label: string;
  icon: IconName;
  instructions: string;
  capabilities: AgentCapability[];
  exits: Array<Pick<AgentExitCondition, 'name' | 'description'>>;
};

export const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: 'support',
    label: 'Customer support specialist',
    icon: 'agent',
    instructions:
      'You are a front-line support specialist.\n\nAnswer the customer’s question using the knowledge base and the workflow variables you already have. Stay concise, warm and specific. Never invent policy, pricing, or delivery promises — if the knowledge base does not cover it, say so and offer a human.\n\nAsk one question at a time, and confirm what you understood before acting.',
    capabilities: ['knowledgeBase', 'buttons', 'callForward', 'end'],
    exits: [
      {
        name: 'Resolved',
        description:
          'The customer confirms their question is answered and they need nothing further.',
      },
      {
        name: 'Needs a human',
        description:
          'The customer asks for a person, is upset, or the request needs an account change the agent cannot make.',
      },
    ],
  },
  {
    id: 'appointment',
    label: 'Appointment specialist',
    icon: 'listen',
    instructions:
      'You book, move and cancel appointments.\n\nFind out what the customer wants to do, then collect exactly what that action needs: the service, a preferred date and time, and a contact detail to confirm on. Offer concrete times rather than asking open questions. Read back the final details before you confirm.',
    capabilities: ['buttons', 'cards', 'end'],
    exits: [
      {
        name: 'Booked',
        description:
          'A date, a time and a contact detail have all been agreed and read back to the customer.',
      },
      {
        name: 'Cancelled',
        description: 'The customer decided not to book after all.',
      },
    ],
  },
  {
    id: 'collector',
    label: 'Information collector specialist',
    icon: 'capture',
    instructions:
      'You collect a specific set of details before the conversation can move on.\n\nAsk for one thing at a time, in plain language, and confirm anything ambiguous. Do not move on until every required value is captured and looks valid. If the customer refuses or goes off-topic twice, take the exit for that instead of pushing.',
    capabilities: ['buttons', 'end'],
    exits: [
      {
        name: 'Collected',
        description: 'Every required value has been captured and confirmed.',
      },
      {
        name: 'Declined',
        description:
          'The customer will not provide the details, or wants to stop being asked.',
      },
    ],
  },
  {
    id: 'qualification',
    label: 'Lead qualification specialist',
    icon: 'crew',
    instructions:
      'You qualify inbound leads without making them feel processed.\n\nEstablish who they are, the size of the team, the problem they are trying to solve and their timeline. Keep it conversational — two questions at most before you give something back. Route strong fits to a human, and point everyone else at the self-serve path.',
    capabilities: ['knowledgeBase', 'buttons', 'callForward', 'end'],
    exits: [
      {
        name: 'Qualified',
        description:
          'The lead has a real use case, a team size, and a timeline inside the next quarter.',
      },
      {
        name: 'Not a fit',
        description:
          'The lead is out of scope, has no timeline, or is only browsing.',
      },
    ],
  },
];

export const agentPersona = (id?: string) =>
  AGENT_PERSONAS.find((persona) => persona.id === id);

const randomId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const createExitCondition = (
  seed?: Pick<AgentExitCondition, 'name' | 'description'>
): AgentExitCondition => ({
  id: randomId('exit'),
  name: seed?.name ?? '',
  description: seed?.description ?? '',
  requiredVariables: [],
  messages: [],
});

export const createExitVariable = () => ({
  id: randomId('var'),
  name: '',
  description: '',
});

export const createAgentTool = (
  kind: AgentToolKind,
  toolName?: string
) => ({
  id: randomId('tool'),
  kind,
  ...(toolName ? { toolName } : {}),
});
