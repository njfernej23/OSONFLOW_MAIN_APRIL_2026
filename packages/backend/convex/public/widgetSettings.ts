import { v } from "convex/values"
import { query } from "../_generated/server"
import { resolveWidgetSettings } from "../system/widgetSettings"

// This query is reachable by anyone who knows an organization id, so it must
// only expose what the embedded widget actually renders. Operational fields
// (system prompt, enabled tool ids, unpublished draft, editor identities) stay
// server-side and are read through internal.system.widgetSettings instead.
export const getByOrganizationId = query({
  args: {
    organizationId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const widgetSettings = await resolveWidgetSettings(ctx, args)

    if (!widgetSettings) {
      return null
    }

    return {
      _id: widgetSettings._id,
      _creationTime: widgetSettings._creationTime,
      organizationId: widgetSettings.organizationId,
      agentId: widgetSettings.agentId,
      name: widgetSettings.name,
      isDefault: widgetSettings.isDefault,
      greetMessage: widgetSettings.greetMessage,
      defaultSuggestions: widgetSettings.defaultSuggestions,
      helpArticles: widgetSettings.helpArticles,
      helpTopics: widgetSettings.helpTopics,
      homeCards: widgetSettings.homeCards,
      theme: widgetSettings.theme,
      appearance: widgetSettings.appearance,
      widgetCopy: widgetSettings.widgetCopy,
      voiceCallSettings: widgetSettings.voiceCallSettings,
      // Only the on/off switch and presentation options are needed to render the
      // voice UI; the widget never chooses the model itself.
      openaiRealtimeSettings: widgetSettings.openaiRealtimeSettings
        ? { enabled: widgetSettings.openaiRealtimeSettings.enabled }
        : undefined,
      geminiLiveSettings: widgetSettings.geminiLiveSettings
        ? { enabled: widgetSettings.geminiLiveSettings.enabled }
        : undefined,
    }
  },
})
