import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import {
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_RECENT_MESSAGES,
  SUPPORT_AGENT_PROMPT,
} from "../constants";


export const supportAgent = new Agent(components.agent, {
  name: "supportAgent",
  languageModel: openai.chat("gpt-4o-mini"),

  instructions: SUPPORT_AGENT_PROMPT,

  // Set here rather than at each call site: the agent merges a call's own
  // contextOptions over these, so widget, WhatsApp, Telegram and Instagram all
  // keep the window even though each passes `excludeToolMessages` of its own.
  contextOptions: {
    recentMessages: CHAT_RECENT_MESSAGES,
  },

  callSettings: {
    maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
  },

  // A tool call and its result are one step, so with the default of 1 the model
  // stops the moment a tool returns and never gets to write the reply. Anything
  // the visitor then sees would have to be the tool's own output, which is
  // internal data. Three steps leave room for a tool call (or two) plus the
  // sentence that answers the visitor.
  maxSteps: 3,
});
