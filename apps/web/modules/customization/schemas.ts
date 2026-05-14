import z from "zod"
import { HEX_COLOR_REGEX } from "@workspace/ui/lib/widget-customization"

const hexColorField = z
  .string()
  .regex(HEX_COLOR_REGEX, "Please provide a valid HEX color (e.g. #3b82f6)")

const imageUrlField = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("data:image/") ||
      z.string().url().safeParse(value).success,
    "Please provide a valid image URL"
  )

const helpArticleSchema = z.object({
  title: z.string().trim().min(1, "Article title is required").max(120),
  excerpt: z.string().trim().min(1, "Article preview is required").max(220),
  body: z.string().trim().min(1, "Article body is required").max(8000),
})

const helpTopicSchema = z.object({
  title: z.string().trim().min(1, "Topic title is required").max(120),
  excerpt: z.string().trim().min(1, "Topic preview is required").max(220),
  articles: z
    .array(helpArticleSchema)
    .min(1, "Add at least one article")
    .max(50, "A topic can have at most 50 articles"),
})

const homeCardSchema = z.object({
  type: z.literal("article"),
  topicIndex: z.coerce.number().int().min(0),
  articleIndex: z.coerce.number().int().min(0),
})

export const widgetSettingsSchema = z.object({
  greetMessage: z.string().min(1, "Greeting message is required"),
  systemPrompt: z
    .string()
    .trim()
    .min(1, "System prompt is required")
    .max(12000, "System prompt must be at most 12000 characters"),
  chatSettings: z.object({
    model: z.string().trim().min(1, "Model is required"),
  }),
  defaultSuggestions: z.object({
    suggestion1: z.string().optional(),
    suggestion2: z.string().optional(),
    suggestion3: z.string().optional(),
  }),
  helpTopics: z
    .array(helpTopicSchema)
    .max(30, "Help center can have at most 30 topics"),
  homeCards: z.array(homeCardSchema).max(12, "Home can show at most 12 cards"),
  vapiSettings: z.object({
    assistantId: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
  openaiRealtimeSettings: z.object({
    enabled: z.boolean().optional(),
    model: z.string().trim().min(1, "Model is required"),
    voice: z.string().trim().min(1, "Voice is required"),
  }),
  geminiLiveSettings: z.object({
    enabled: z.boolean().optional(),
    model: z.string().trim().min(1, "Model is required"),
    voice: z.string().trim().min(1, "Voice is required"),
  }),
  theme: z.object({
    primaryColor: hexColorField,
    headerGradientStart: hexColorField,
    headerGradientEnd: hexColorField,
    userBubbleColor: hexColorField,
    botBubbleColor: hexColorField,
    borderRadius: z.coerce.number().min(0).max(32),
    logoUrl: imageUrlField,
    backgroundImageUrl: imageUrlField,
    assistantName: z
      .string()
      .trim()
      .min(1, "Assistant name is required")
      .max(40, "Assistant name must be at most 40 characters"),
  }),
  appearance: z.object({
    launcherColor: hexColorField,
    launcherLabel: z
      .string()
      .trim()
      .min(1, "Launcher label is required")
      .max(40, "Launcher label must be at most 40 characters"),
    launcherIcon: z.enum(["chat", "sparkles", "question"]),
    launcherIconUrl: imageUrlField,
    animation: z.enum(["slide-up", "scale", "fade", "pop"]),
    poweredByText: z
      .string()
      .trim()
      .min(1, "Powered by text is required")
      .max(40, "Powered by text must be at most 40 characters"),
    showPoweredBy: z.boolean(),
    showHelpCenter: z.boolean(),
  }),
})
