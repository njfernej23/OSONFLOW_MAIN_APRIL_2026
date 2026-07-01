/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as constants from "../constants.js";
import type * as http from "../http.js";
import type * as lib_agentMessageText from "../lib/agentMessageText.js";
import type * as lib_assistantTools from "../lib/assistantTools.js";
import type * as lib_extractTextContent from "../lib/extractTextContent.js";
import type * as lib_googleSheetsAuth from "../lib/googleSheetsAuth.js";
import type * as lib_googleSheetsCrud from "../lib/googleSheetsCrud.js";
import type * as lib_googleSheetsDrive from "../lib/googleSheetsDrive.js";
import type * as lib_googleSheetsOAuth from "../lib/googleSheetsOAuth.js";
import type * as lib_instagramApi from "../lib/instagramApi.js";
import type * as lib_instagramOAuth from "../lib/instagramOAuth.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_organizationIdentity from "../lib/organizationIdentity.js";
import type * as lib_polarWebhook from "../lib/polarWebhook.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_secrets from "../lib/secrets.js";
import type * as lib_voiceToolDeclarations from "../lib/voiceToolDeclarations.js";
import type * as lib_webhookBaseUrl from "../lib/webhookBaseUrl.js";
import type * as private_aiConversations from "../private/aiConversations.js";
import type * as private_analytics from "../private/analytics.js";
import type * as private_assistantTools from "../private/assistantTools.js";
import type * as private_contactSessions from "../private/contactSessions.js";
import type * as private_conversations from "../private/conversations.js";
import type * as private_customerMemories from "../private/customerMemories.js";
import type * as private_files from "../private/files.js";
import type * as private_googleSheets from "../private/googleSheets.js";
import type * as private_googleSheetsActions from "../private/googleSheetsActions.js";
import type * as private_instagram from "../private/instagram.js";
import type * as private_integrationWebhooks from "../private/integrationWebhooks.js";
import type * as private_leads from "../private/leads.js";
import type * as private_messages from "../private/messages.js";
import type * as private_orgTransfer from "../private/orgTransfer.js";
import type * as private_plugins from "../private/plugins.js";
import type * as private_savedReplies from "../private/savedReplies.js";
import type * as private_secrets from "../private/secrets.js";
import type * as private_subscriptions from "../private/subscriptions.js";
import type * as private_telegram from "../private/telegram.js";
import type * as private_vapi from "../private/vapi.js";
import type * as private_whatsapp from "../private/whatsapp.js";
import type * as private_widgetSettings from "../private/widgetSettings.js";
import type * as private_workflows from "../private/workflows.js";
import type * as public_aiConversations from "../public/aiConversations.js";
import type * as public_assistantTools from "../public/assistantTools.js";
import type * as public_contactSessions from "../public/contactSessions.js";
import type * as public_conversations from "../public/conversations.js";
import type * as public_messages from "../public/messages.js";
import type * as public_organizations from "../public/organizations.js";
import type * as public_secrets from "../public/secrets.js";
import type * as public_voiceKnowledgeBase from "../public/voiceKnowledgeBase.js";
import type * as public_widgetSettings from "../public/widgetSettings.js";
import type * as public_workflows from "../public/workflows.js";
import type * as system_ai_agents_supportAgent from "../system/ai/agents/supportAgent.js";
import type * as system_ai_constants from "../system/ai/constants.js";
import type * as system_ai_rag from "../system/ai/rag.js";
import type * as system_ai_replyCache from "../system/ai/replyCache.js";
import type * as system_ai_tools_buildAssistantTools from "../system/ai/tools/buildAssistantTools.js";
import type * as system_ai_tools_escalateConversation from "../system/ai/tools/escalateConversation.js";
import type * as system_ai_tools_resolveConversation from "../system/ai/tools/resolveConversation.js";
import type * as system_ai_tools_search from "../system/ai/tools/search.js";
import type * as system_assistantTools from "../system/assistantTools.js";
import type * as system_assistantTools_execute from "../system/assistantTools/execute.js";
import type * as system_assistantTools_getChatTools from "../system/assistantTools/getChatTools.js";
import type * as system_contactSessions from "../system/contactSessions.js";
import type * as system_conversations from "../system/conversations.js";
import type * as system_googleSheets from "../system/googleSheets.js";
import type * as system_instagram from "../system/instagram.js";
import type * as system_integrationWebhooks from "../system/integrationWebhooks.js";
import type * as system_intelligence from "../system/intelligence.js";
import type * as system_orgTransfer from "../system/orgTransfer.js";
import type * as system_plugins from "../system/plugins.js";
import type * as system_secrets from "../system/secrets.js";
import type * as system_subscriptions from "../system/subscriptions.js";
import type * as system_telegram from "../system/telegram.js";
import type * as system_whatsapp from "../system/whatsapp.js";
import type * as system_workflowRuntime from "../system/workflowRuntime.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  constants: typeof constants;
  http: typeof http;
  "lib/agentMessageText": typeof lib_agentMessageText;
  "lib/assistantTools": typeof lib_assistantTools;
  "lib/extractTextContent": typeof lib_extractTextContent;
  "lib/googleSheetsAuth": typeof lib_googleSheetsAuth;
  "lib/googleSheetsCrud": typeof lib_googleSheetsCrud;
  "lib/googleSheetsDrive": typeof lib_googleSheetsDrive;
  "lib/googleSheetsOAuth": typeof lib_googleSheetsOAuth;
  "lib/instagramApi": typeof lib_instagramApi;
  "lib/instagramOAuth": typeof lib_instagramOAuth;
  "lib/openai": typeof lib_openai;
  "lib/organizationIdentity": typeof lib_organizationIdentity;
  "lib/polarWebhook": typeof lib_polarWebhook;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/secrets": typeof lib_secrets;
  "lib/voiceToolDeclarations": typeof lib_voiceToolDeclarations;
  "lib/webhookBaseUrl": typeof lib_webhookBaseUrl;
  "private/aiConversations": typeof private_aiConversations;
  "private/analytics": typeof private_analytics;
  "private/assistantTools": typeof private_assistantTools;
  "private/contactSessions": typeof private_contactSessions;
  "private/conversations": typeof private_conversations;
  "private/customerMemories": typeof private_customerMemories;
  "private/files": typeof private_files;
  "private/googleSheets": typeof private_googleSheets;
  "private/googleSheetsActions": typeof private_googleSheetsActions;
  "private/instagram": typeof private_instagram;
  "private/integrationWebhooks": typeof private_integrationWebhooks;
  "private/leads": typeof private_leads;
  "private/messages": typeof private_messages;
  "private/orgTransfer": typeof private_orgTransfer;
  "private/plugins": typeof private_plugins;
  "private/savedReplies": typeof private_savedReplies;
  "private/secrets": typeof private_secrets;
  "private/subscriptions": typeof private_subscriptions;
  "private/telegram": typeof private_telegram;
  "private/vapi": typeof private_vapi;
  "private/whatsapp": typeof private_whatsapp;
  "private/widgetSettings": typeof private_widgetSettings;
  "private/workflows": typeof private_workflows;
  "public/aiConversations": typeof public_aiConversations;
  "public/assistantTools": typeof public_assistantTools;
  "public/contactSessions": typeof public_contactSessions;
  "public/conversations": typeof public_conversations;
  "public/messages": typeof public_messages;
  "public/organizations": typeof public_organizations;
  "public/secrets": typeof public_secrets;
  "public/voiceKnowledgeBase": typeof public_voiceKnowledgeBase;
  "public/widgetSettings": typeof public_widgetSettings;
  "public/workflows": typeof public_workflows;
  "system/ai/agents/supportAgent": typeof system_ai_agents_supportAgent;
  "system/ai/constants": typeof system_ai_constants;
  "system/ai/rag": typeof system_ai_rag;
  "system/ai/replyCache": typeof system_ai_replyCache;
  "system/ai/tools/buildAssistantTools": typeof system_ai_tools_buildAssistantTools;
  "system/ai/tools/escalateConversation": typeof system_ai_tools_escalateConversation;
  "system/ai/tools/resolveConversation": typeof system_ai_tools_resolveConversation;
  "system/ai/tools/search": typeof system_ai_tools_search;
  "system/assistantTools": typeof system_assistantTools;
  "system/assistantTools/execute": typeof system_assistantTools_execute;
  "system/assistantTools/getChatTools": typeof system_assistantTools_getChatTools;
  "system/contactSessions": typeof system_contactSessions;
  "system/conversations": typeof system_conversations;
  "system/googleSheets": typeof system_googleSheets;
  "system/instagram": typeof system_instagram;
  "system/integrationWebhooks": typeof system_integrationWebhooks;
  "system/intelligence": typeof system_intelligence;
  "system/orgTransfer": typeof system_orgTransfer;
  "system/plugins": typeof system_plugins;
  "system/secrets": typeof system_secrets;
  "system/subscriptions": typeof system_subscriptions;
  "system/telegram": typeof system_telegram;
  "system/whatsapp": typeof system_whatsapp;
  "system/workflowRuntime": typeof system_workflowRuntime;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
