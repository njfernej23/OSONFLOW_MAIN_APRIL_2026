import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import {
  useFieldArray,
  useForm,
  type Path,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  BoldIcon,
  BrainCircuitIcon,
  ChevronRightIcon,
  FileTextIcon,
  Heading2Icon,
  HistoryIcon,
  ItalicIcon,
  LayoutGridIcon,
  LibraryIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  MicIcon,
  MousePointerClickIcon,
  PaletteIcon,
  PlusIcon,
  QuoteIcon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
  Trash2Icon,
  TypeIcon,
  WrenchIcon,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  clampAutoOpenDelaySeconds,
  clampBorderRadius,
  clampLauncherOffset,
  clampLauncherPromptDelaySeconds,
  clampLauncherSize,
  DEFAULT_WIDGET_APPEARANCE,
  DEFAULT_WIDGET_COPY,
  mergeWidgetAppearance,
  mergeWidgetCopy,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"
import {
  richTextStorageToHtml,
  sanitizeRichTextHtml,
} from "@workspace/ui/lib/rich-text"
import { cn } from "@workspace/ui/lib/utils"
import { Doc, Id } from "@workspace/backend/_generated/dataModel"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"

import { OpenAIRealtimeFormFields } from "./openai-realtime-form-fields"
import { VoiceCallSettingsFormFields } from "./voice-call-settings-form-fields"
import { ThemeFormFields } from "./theme-form-fields"
import { AppearanceFormFields } from "./appearance-form-fields"
import { CopyFormFields } from "./copy-form-fields"
import { WidgetLivePreview } from "./widget-live-preview"
import { WidgetToolsPicker } from "./widget-tools-picker"
import {
  ReleaseDrawer,
  type WidgetSettingsVersionSummary,
} from "./release-drawer"
import {
  SettingRow,
  SettingsDivider,
  SettingsGroup,
  SettingsNotice,
} from "./settings-primitives"
import { FormSchema } from "../../types"
import { widgetSettingsSchema } from "../../schemas"
import {
  hasConvexHostedImageUrl,
  parseWidgetSettingsImport,
  serializeWidgetSettingsExport,
} from "../../lib/settings-transfer"

type WidgetSettings = Doc<"widgetSettings">
type WidgetSettingsSnapshot = Pick<
  WidgetSettings,
  | "greetMessage"
  | "systemPrompt"
  | "enabledToolIds"
  | "defaultSuggestions"
  | "helpTopics"
  | "homeCards"
  | "theme"
  | "appearance"
  | "widgetCopy"
> & {
  chatSettings?: {
    model?: string
  }
  openaiRealtimeSettings?: {
    enabled?: boolean
    model?: string
    voice?: string
  }
  geminiLiveSettings?: {
    enabled?: boolean
    model?: string
    voice?: string
  }
  voiceCallSettings?: {
    autoEndOnGoodbye?: boolean
    customGoodbyePhrases?: string[]
    idleTimeoutSeconds?: number
    maxDurationSeconds?: number
  }
}

interface CustomizationFormProps {
  agentId: string
  draftData: WidgetSettingsSnapshot
  publishedVersion: number
  publishedAt?: number
  draftUpdatedAt?: number
  isDraftDifferentFromPublished: boolean
  versions: WidgetSettingsVersionSummary[]
}

const defaultHelpTopics: FormSchema["helpTopics"] = [
  {
    title: "Getting started",
    excerpt: "Setup guides and first steps for new users.",
    articles: [
      {
        title: "How do I get started?",
        excerpt:
          "Learn the fastest way to begin and get value from the product.",
        body: "Getting started is simple:\n\n1. Create your account and complete the first setup steps.\n2. Add your key details so the assistant can understand your needs.\n3. Open chat if you need help with a specific question.",
      },
      {
        title: "What should I do first?",
        excerpt: "A quick checklist for the first useful actions.",
        body: "Start with the most important setup items first.\n\nConfirm your profile, review the available tools, and ask the assistant any product-specific question you have.",
      },
      {
        title: "Where can I ask questions?",
        excerpt: "Find the best place to get help in the widget.",
        body: "Use the Help tab for written articles. Use Messages or Start AI chat when you want a conversational answer.",
      },
    ],
  },
  {
    title: "Billing and plans",
    excerpt: "Plan, billing, and subscription information.",
    articles: [
      {
        title: "What are your pricing plans?",
        excerpt:
          "Review where to find plan, billing, and subscription information.",
        body: "Pricing depends on the plan and features enabled for your organization.\n\nYou can check the current plan from your account or billing page.",
      },
      {
        title: "How do I update billing?",
        excerpt: "Learn where billing details are managed.",
        body: "Billing details are usually managed from your account billing page.\n\nIf you cannot find it, start an AI chat and ask for billing help.",
      },
      {
        title: "Can I change my plan?",
        excerpt: "Understand the next step for upgrades or changes.",
        body: "Plan changes depend on your organization settings.\n\nContact support or start an AI chat with the plan you want to change to.",
      },
    ],
  },
  {
    title: "Account help",
    excerpt: "Login, access, and profile issue guidance.",
    articles: [
      {
        title: "I need help with my account",
        excerpt:
          "Find the best next step for login, access, or profile issues.",
        body: "For account help, first confirm that your email address and organization are correct.\n\nIf you cannot access something, start an AI chat with the details of the issue.",
      },
      {
        title: "I cannot log in",
        excerpt: "Troubleshoot login and access problems.",
        body: "Check that you are using the right email address and organization.\n\nIf login still fails, include the error message when you contact support.",
      },
      {
        title: "How do I update my profile?",
        excerpt: "Find where your personal account details live.",
        body: "Profile settings are managed in your account area.\n\nIf you do not see the field you need, ask the assistant for help.",
      },
    ],
  },
]

const defaultHomeCards: FormSchema["homeCards"] = [
  { type: "article", topicIndex: 0, articleIndex: 0 },
  { type: "article", topicIndex: 1, articleIndex: 0 },
  { type: "article", topicIndex: 2, articleIndex: 0 },
]

type ModelOption = {
  value: string
  label: string
  description: string
}

const defaultChatModel = "gpt-4o-mini"

const openAIChatModels: ModelOption[] = [
  {
    value: "gpt-5.2",
    label: "GPT-5.2",
    description: "Best quality for complex support answers",
  },
  {
    value: "gpt-5.1",
    label: "GPT-5.1",
    description: "Strong reasoning and general support",
  },
  {
    value: "gpt-5",
    label: "GPT-5",
    description: "Previous intelligent reasoning model",
  },
  {
    value: "gpt-5-mini",
    label: "GPT-5 mini",
    description: "Balanced quality, speed, and cost",
  },
  {
    value: "gpt-5-nano",
    label: "GPT-5 nano",
    description: "Fastest and lowest cost",
  },
  {
    value: "gpt-4.1",
    label: "GPT-4.1",
    description: "Strong non-reasoning chat model",
  },
  {
    value: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    description: "Fast general-purpose support chat",
  },
  {
    value: "gpt-4.1-nano",
    label: "GPT-4.1 nano",
    description: "Fastest GPT-4.1 option",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "Legacy multimodal GPT-4o model",
  },
  {
    value: defaultChatModel,
    label: "GPT-4o mini",
    description: "Current default, fast and affordable",
  },
]

const getSelectableChatModelOptions = (currentValue?: string) => {
  const trimmedValue = currentValue?.trim()

  if (!trimmedValue) {
    return openAIChatModels
  }

  if (openAIChatModels.some((option) => option.value === trimmedValue)) {
    return openAIChatModels
  }

  return [
    {
      value: trimmedValue,
      label: trimmedValue,
      description: "Saved custom model",
    },
    ...openAIChatModels,
  ]
}

type LegacyHelpTopic = {
  title: string
  excerpt: string
  articles: {
    article1: FormSchema["helpTopics"][number]["articles"][number]
    article2: FormSchema["helpTopics"][number]["articles"][number]
    article3: FormSchema["helpTopics"][number]["articles"][number]
  }
}

type LegacyHelpTopics = {
  topic1: LegacyHelpTopic
  topic2: LegacyHelpTopic
  topic3: LegacyHelpTopic
}

const isLegacyHelpTopics = (value: unknown): value is LegacyHelpTopics => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "topic1" in value &&
    "topic2" in value &&
    "topic3" in value
  )
}

const normalizeHelpTopicsForForm = (
  value: unknown
): FormSchema["helpTopics"] => {
  if (Array.isArray(value)) {
    return value
  }

  if (!isLegacyHelpTopics(value)) {
    return defaultHelpTopics
  }

  return [value.topic1, value.topic2, value.topic3].map((topic) => ({
    title: topic.title,
    excerpt: topic.excerpt,
    articles: [
      topic.articles.article1,
      topic.articles.article2,
      topic.articles.article3,
    ],
  }))
}

const normalizeHomeCardsForForm = (
  value: unknown,
  topics: FormSchema["helpTopics"]
): FormSchema["homeCards"] => {
  const fallback = topics
    .map((topic, topicIndex) =>
      topic.articles[0]
        ? ({
            type: "article" as const,
            topicIndex,
            articleIndex: 0,
          } satisfies FormSchema["homeCards"][number])
        : null
    )
    .filter((card): card is FormSchema["homeCards"][number] => card !== null)
    .slice(0, 3)

  if (!Array.isArray(value)) {
    return fallback.length ? fallback : defaultHomeCards
  }

  const normalized = value
    .map((card) => {
      if (typeof card !== "object" || card === null) return null

      const raw = card as {
        type?: unknown
        topicIndex?: unknown
        articleIndex?: unknown
      }
      const topicIndex = Number(raw.topicIndex)
      const articleIndex = Number(raw.articleIndex)

      if (
        !Number.isInteger(topicIndex) ||
        topicIndex < 0 ||
        !topics[topicIndex]
      ) {
        return null
      }

      const safeArticleIndex =
        Number.isInteger(articleIndex) && articleIndex >= 0 ? articleIndex : 0
      if (!topics[topicIndex]?.articles[safeArticleIndex]) return null
      return {
        type: "article" as const,
        topicIndex,
        articleIndex: safeArticleIndex,
      }
    })
    .filter((card): card is FormSchema["homeCards"][number] => card !== null)

  return normalized.length ? normalized : fallback
}

const createHelpArticle = (
  index: number
): FormSchema["helpTopics"][number]["articles"][number] => ({
  title: `New article ${index}`,
  excerpt: "Short summary for this article.",
  body: "Write the full article here.\n\nUse **bold**, _italic_, headings, lists, links, and quotes.",
})

const createHelpTopic = (index: number): FormSchema["helpTopics"][number] => ({
  title: `New topic ${index}`,
  excerpt: "Short preview shown on the Home card.",
  articles: [createHelpArticle(1)],
})

const buildFormDefaultValues = (
  snapshot: WidgetSettingsSnapshot
): FormSchema => {
  const defaultTheme = mergeWidgetTheme(snapshot.theme)
  const defaultAppearance = mergeWidgetAppearance(snapshot.appearance)
  const helpTopics = normalizeHelpTopicsForForm(snapshot.helpTopics)
  return {
    greetMessage: snapshot.greetMessage || "Hi! How can I help you today?",
    systemPrompt: snapshot.systemPrompt || "",
    enabledToolIds: snapshot.enabledToolIds,
    chatSettings: {
      model: snapshot.chatSettings?.model || defaultChatModel,
    },
    defaultSuggestions: {
      suggestion1: snapshot.defaultSuggestions.suggestion1 || "",
      suggestion2: snapshot.defaultSuggestions.suggestion2 || "",
      suggestion3: snapshot.defaultSuggestions.suggestion3 || "",
    },
    helpTopics,
    homeCards: normalizeHomeCardsForForm(snapshot.homeCards, helpTopics),
    openaiRealtimeSettings: {
      enabled: snapshot.openaiRealtimeSettings?.enabled ?? false,
      model: snapshot.openaiRealtimeSettings?.model || "gpt-realtime",
      voice: snapshot.openaiRealtimeSettings?.voice || "marin",
    },
    geminiLiveSettings: {
      enabled: snapshot.geminiLiveSettings?.enabled ?? false,
      model:
        snapshot.geminiLiveSettings?.model ||
        "gemini-2.5-flash-native-audio-preview-12-2025",
      voice: snapshot.geminiLiveSettings?.voice || "Kore",
    },
    voiceCallSettings: {
      autoEndOnGoodbye: snapshot.voiceCallSettings?.autoEndOnGoodbye ?? true,
      idleTimeoutSeconds: snapshot.voiceCallSettings?.idleTimeoutSeconds ?? 120,
      maxDurationSeconds: snapshot.voiceCallSettings?.maxDurationSeconds ?? 600,
      customGoodbyePhrases: (
        snapshot.voiceCallSettings?.customGoodbyePhrases ?? []
      ).join("\n"),
    },
    theme: defaultTheme,
    appearance: defaultAppearance,
    widgetCopy: mergeWidgetCopy(snapshot.widgetCopy),
  }
}

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "Not available"
  return `${formatDistanceToNow(timestamp)} ago`
}

const cleanHelpTopicsForSave = (
  topics: FormSchema["helpTopics"]
): FormSchema["helpTopics"] =>
  topics.map((topic) => ({
    title: topic.title.trim(),
    excerpt: topic.excerpt.trim(),
    articles: topic.articles.map((article) => ({
      title: article.title.trim(),
      excerpt: article.excerpt.trim(),
      body: article.body.trim(),
    })),
  }))

const cleanHomeCardsForSave = (
  cards: FormSchema["homeCards"],
  topics: FormSchema["helpTopics"]
): FormSchema["homeCards"] => {
  const normalized = cards.reduce<FormSchema["homeCards"]>((items, card) => {
    const topicIndex = Math.max(0, Math.round(Number(card.topicIndex)))
    if (!topics[topicIndex]) return items

    const articleIndex = Math.max(0, Math.round(Number(card.articleIndex)))
    if (!topics[topicIndex]?.articles[articleIndex]) return items
    items.push({ type: "article", topicIndex, articleIndex })
    return items
  }, [])

  return normalized.length
    ? normalized
    : topics.length
      ? topics
          .map((topic, topicIndex) =>
            topic.articles[0]
              ? ({
                  type: "article" as const,
                  topicIndex,
                  articleIndex: 0,
                } satisfies FormSchema["homeCards"][number])
              : null
          )
          .filter(
            (card): card is FormSchema["homeCards"][number] => card !== null
          )
          .slice(0, 1)
      : []
}

type AutoSaveStatus = "idle" | "saving" | "saved"

type RichTextFormat =
  | "bold"
  | "italic"
  | "heading"
  | "bullet"
  | "numbered"
  | "quote"
  | "link"

type RichTextFormatConfig = {
  command: RichTextFormat
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const richTextFormats: RichTextFormatConfig[] = [
  { command: "bold", label: "Bold", icon: BoldIcon },
  { command: "italic", label: "Italic", icon: ItalicIcon },
  { command: "heading", label: "Heading", icon: Heading2Icon },
  { command: "bullet", label: "Bulleted list", icon: ListIcon },
  { command: "numbered", label: "Numbered list", icon: ListOrderedIcon },
  { command: "quote", label: "Quote", icon: QuoteIcon },
  { command: "link", label: "Link", icon: LinkIcon },
]

type ArticleBodyFieldProps = {
  form: UseFormReturn<FormSchema>
  name: Path<FormSchema>
}

type RichArticleEditorProps = {
  onBlur: () => void
  onChange: (value: string) => void
  value: string
}

const RichArticleEditor = ({
  onBlur,
  onChange,
  value,
}: RichArticleEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const isFocusedRef = useRef(false)

  const syncEditorToField = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    onChange(sanitizeRichTextHtml(editor.innerHTML))
  }, [onChange])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || isFocusedRef.current) return

    const nextHtml = richTextStorageToHtml(value)
    if (sanitizeRichTextHtml(editor.innerHTML) !== nextHtml) {
      editor.innerHTML = nextHtml
    }
  }, [value])

  const applyFormat = (command: RichTextFormat) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()

    if (command === "link") {
      const href = window.prompt("Paste a link")
      if (!href) return
      document.execCommand("createLink", false, href)
      syncEditorToField()
      return
    }

    const commandMap: Record<Exclude<RichTextFormat, "link">, string> = {
      bold: "bold",
      italic: "italic",
      heading: "formatBlock",
      bullet: "insertUnorderedList",
      numbered: "insertOrderedList",
      quote: "formatBlock",
    }

    const valueMap: Partial<Record<Exclude<RichTextFormat, "link">, string>> = {
      heading: "h2",
      quote: "blockquote",
    }

    document.execCommand(commandMap[command], false, valueMap[command])
    syncEditorToField()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--console-hairline-soft)] bg-muted/35 p-1.5">
        {richTextFormats.map((format) => {
          const Icon = format.icon
          return (
            <Button
              aria-label={format.label}
              className="size-8 rounded-md"
              key={format.command}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat(format.command)}
              size="icon"
              title={format.label}
              type="button"
              variant="ghost"
            >
              <Icon className="size-3.5" />
            </Button>
          )
        })}
      </div>
      <div className="relative">
        <div
          aria-label="Article body"
          className="min-h-[240px] overflow-y-auto px-3 py-3 text-sm leading-relaxed outline-none empty:before:text-muted-foreground/60 empty:before:content-[attr(data-placeholder)] focus-visible:ring-3 focus-visible:ring-ring/35 [&_a]:font-medium [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:my-3 [&_ul]:ml-5 [&_ul]:list-disc"
          contentEditable
          data-placeholder="Write the full article here"
          onBlur={() => {
            isFocusedRef.current = false
            syncEditorToField()
            onBlur()
          }}
          onFocus={() => {
            isFocusedRef.current = true
          }}
          onInput={syncEditorToField}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
    </div>
  )
}

const ArticleBodyField = ({ form, name }: ArticleBodyFieldProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel className="text-xs font-medium">Article Body</FormLabel>
            <FormControl>
              <RichArticleEditor
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={typeof field.value === "string" ? field.value : ""}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Formatting is applied directly in the editor, the same way
              customers will see it in the widget article.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

type HelpTopicEditorProps = {
  canRemoveTopic: boolean
  form: UseFormReturn<FormSchema>
  onRemoveTopic: () => void
  topicIndex: number
}

const HelpTopicEditor = ({
  canRemoveTopic,
  form,
  onRemoveTopic,
  topicIndex,
}: HelpTopicEditorProps) => {
  const articleArray = useFieldArray({
    control: form.control,
    name: `helpTopics.${topicIndex}.articles` as "helpTopics.0.articles",
  })

  const topicTitleName = `helpTopics.${topicIndex}.title` as Path<FormSchema>
  const topicExcerptName =
    `helpTopics.${topicIndex}.excerpt` as Path<FormSchema>

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--console-hairline-soft)] bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground">
            {topicIndex + 1}
          </div>
          <p className="text-sm font-semibold">Topic {topicIndex + 1}</p>
          <Badge className="text-[11px]" variant="outline">
            {articleArray.fields.length} article
            {articleArray.fields.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <Button
          className="h-8 gap-1.5 text-xs"
          disabled={!canRemoveTopic}
          onClick={onRemoveTopic}
          type="button"
          variant="outline"
        >
          <Trash2Icon className="size-3.5" />
          Remove topic
        </Button>
      </div>

      <FormField
        control={form.control}
        name={topicTitleName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Topic Title</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="bg-card"
                placeholder="Getting started"
                value={typeof field.value === "string" ? field.value : ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={topicExcerptName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-medium">Topic Preview</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="resize-none bg-card"
                placeholder="Short preview shown on the Home card"
                rows={2}
                value={typeof field.value === "string" ? field.value : ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3 border-t border-[var(--console-hairline-soft)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Articles in this topic
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              Add as many article rows as this topic needs.
            </p>
          </div>
          <Button
            className="h-8 gap-1.5 text-xs"
            onClick={() =>
              articleArray.append(
                createHelpArticle(articleArray.fields.length + 1)
              )
            }
            type="button"
            variant="outline"
          >
            <PlusIcon className="size-3.5" />
            Add article
          </Button>
        </div>

        {articleArray.fields.map((articleField, articleIndex) => {
          const articleTitleName =
            `helpTopics.${topicIndex}.articles.${articleIndex}.title` as Path<FormSchema>
          const articleExcerptName =
            `helpTopics.${topicIndex}.articles.${articleIndex}.excerpt` as Path<FormSchema>
          const articleBodyName =
            `helpTopics.${topicIndex}.articles.${articleIndex}.body` as Path<FormSchema>

          return (
            <div
              className="space-y-3 rounded-xl border border-[var(--console-hairline-soft)] bg-background/55 p-3"
              key={articleField.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold">
                  Article {articleIndex + 1}
                </p>
                <Button
                  className="h-8 gap-1.5 text-xs"
                  disabled={articleArray.fields.length <= 1}
                  onClick={() => articleArray.remove(articleIndex)}
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon className="size-3.5" />
                  Remove
                </Button>
              </div>

              <FormField
                control={form.control}
                name={articleTitleName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      Article Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-card"
                        placeholder="When should I set my date?"
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={articleExcerptName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      Article Preview
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none bg-card"
                        placeholder="Short summary shown in the topic article list"
                        rows={2}
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ArticleBodyField form={form} name={articleBodyName} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The editor is split by the job an operator came to do, not by the shape of
 * the stored document. Each entry drives the nav rail, the panel header and
 * which surface the preview is most useful for.
 */
type SectionId =
  | "behaviour"
  | "copy"
  | "brand"
  | "launcher"
  | "help"
  | "voice"

const SECTIONS: Array<{
  id: SectionId
  label: string
  description: string
  icon: typeof PaletteIcon
}> = [
  {
    id: "behaviour",
    label: "Behaviour",
    description:
      "The model that answers, the instructions it follows, and the tools it may call.",
    icon: BrainCircuitIcon,
  },
  {
    id: "copy",
    label: "Copy",
    description:
      "Every visitor-facing string, from the home headline to the composer placeholder.",
    icon: TypeIcon,
  },
  {
    id: "brand",
    label: "Brand kit",
    description:
      "Colour, typeface, logo and the marks a visitor recognises as yours.",
    icon: PaletteIcon,
  },
  {
    id: "launcher",
    label: "Launcher",
    description:
      "The floating button: where it sits, how large it is, and when it opens itself.",
    icon: MousePointerClickIcon,
  },
  {
    id: "help",
    label: "Help centre",
    description:
      "Topics and articles the widget can answer from before starting a conversation.",
    icon: FileTextIcon,
  },
  {
    id: "voice",
    label: "Voice",
    description: "Live voice providers, the voice launcher and call handling.",
    icon: MicIcon,
  },
]

export const CustomizationForm = ({
  agentId,
  draftData,
  publishedVersion,
  publishedAt,
  draftUpdatedAt,
  isDraftDifferentFromPublished,
  versions,
}: CustomizationFormProps) => {
  const saveDraftWidgetSettings = useMutation(
    api.private.widgetSettings.saveDraft
  )
  const publishDraftWidgetSettings = useMutation(
    api.private.widgetSettings.publishDraft
  )
  const rollbackWidgetSettingsVersion = useMutation(
    api.private.widgetSettings.rollbackToVersion
  )

  const [isPublishing, setIsPublishing] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isReleaseDrawerOpen, setIsReleaseDrawerOpen] = useState(false)
  const [importPayload, setImportPayload] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<SectionId>("behaviour")
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm<FormSchema, any, FormSchema>({
    resolver: zodResolver(widgetSettingsSchema) as Resolver<
      FormSchema,
      any,
      FormSchema
    >,
    defaultValues: buildFormDefaultValues(draftData),
  })
  const helpTopicsArray = useFieldArray({
    control: form.control,
    name: "helpTopics",
  })
  const homeCardsArray = useFieldArray({
    control: form.control,
    name: "homeCards",
  })

  const watchedValues = form.watch()
  const previewTheme = mergeWidgetTheme(watchedValues.theme)
  const previewAppearance = mergeWidgetAppearance(watchedValues.appearance)
  const previewCopy = mergeWidgetCopy(watchedValues.widgetCopy)
  const previewSuggestions = [
    watchedValues.defaultSuggestions?.suggestion1,
    watchedValues.defaultSuggestions?.suggestion2,
    watchedValues.defaultSuggestions?.suggestion3,
  ].filter((s): s is string => Boolean(s))
  const previewVoiceOnly = Boolean(
    watchedValues.openaiRealtimeSettings?.enabled ||
    watchedValues.geminiLiveSettings?.enabled
  )

  const isBusy = form.formState.isSubmitting || isPublishing || isRollingBack

  const systemPromptLen = watchedValues.systemPrompt?.length ?? 0
  const tokenEstimate = Math.ceil(systemPromptLen / 4)
  const enabledToolCount = watchedValues.enabledToolIds?.length ?? 0
  const helpTopicCount = watchedValues.helpTopics?.length ?? 0
  const suggestionCount = previewSuggestions.length

  // Each section reports one fact, so the nav answers "what is configured
  // here?" without the operator having to open every tab.
  const sectionSummaries: Record<SectionId, string> = {
    behaviour: `${watchedValues.chatSettings?.model ?? defaultChatModel} · ${enabledToolCount} tool${enabledToolCount === 1 ? "" : "s"}`,
    copy: `${suggestionCount} suggestion${suggestionCount === 1 ? "" : "s"}`,
    brand: previewTheme.headerBrandMode === "none"
      ? "No brand mark"
      : previewTheme.headerBrandMode === "text"
        ? "Wordmark"
        : "Logo",
    launcher: `${previewAppearance.launcherPosition === "bottom-right" ? "Right" : "Left"} · ${previewAppearance.launcherSize}px`,
    help: previewAppearance.showHelpCenter
      ? `${helpTopicCount} topic${helpTopicCount === 1 ? "" : "s"}`
      : "Hidden",
    voice: previewVoiceOnly ? "Live voice on" : "Off",
  }

  const buildMutationPayload = useCallback(
    (values: FormSchema) => {
      const theme: NonNullable<WidgetSettings["theme"]> = {
        ...values.theme,
        borderRadius: clampBorderRadius(Number(values.theme.borderRadius)),
        logoUrl: values.theme.logoUrl.trim(),
        backgroundImageUrl: values.theme.backgroundImageUrl.trim(),
        assistantName: values.theme.assistantName.trim(),
        headerBannerImageUrl: values.theme.headerBannerImageUrl.trim(),
        headerBannerText: values.theme.headerBannerText.trim(),
      }
      const appearance: NonNullable<WidgetSettings["appearance"]> = {
        ...values.appearance,
        launcherLabel:
          values.appearance.launcherLabel.trim() ||
          DEFAULT_WIDGET_APPEARANCE.launcherLabel,
        voiceLauncherLabel:
          values.appearance.voiceLauncherLabel.trim() ||
          DEFAULT_WIDGET_APPEARANCE.voiceLauncherLabel,
        launcherIconUrl: values.appearance.launcherIconUrl.trim(),
        launcherPromptText:
          values.appearance.launcherPromptText.trim() ||
          DEFAULT_WIDGET_APPEARANCE.launcherPromptText,
        launcherPromptDelaySeconds: clampLauncherPromptDelaySeconds(
          Number(values.appearance.launcherPromptDelaySeconds)
        ),
        poweredByText:
          values.appearance.poweredByText.trim() ||
          DEFAULT_WIDGET_APPEARANCE.poweredByText,
        launcherOffsetX: clampLauncherOffset(
          Number(values.appearance.launcherOffsetX)
        ),
        launcherOffsetY: clampLauncherOffset(
          Number(values.appearance.launcherOffsetY)
        ),
        launcherSize: clampLauncherSize(Number(values.appearance.launcherSize)),
        autoOpenDelaySeconds: clampAutoOpenDelaySeconds(
          Number(values.appearance.autoOpenDelaySeconds)
        ),
      }
      const widgetCopy: NonNullable<WidgetSettings["widgetCopy"]> = {
        homeGreeting:
          values.widgetCopy.homeGreeting.trim() ||
          DEFAULT_WIDGET_COPY.homeGreeting,
        homeHeadline:
          values.widgetCopy.homeHeadline.trim() ||
          DEFAULT_WIDGET_COPY.homeHeadline,
        startChatLabel:
          values.widgetCopy.startChatLabel.trim() ||
          DEFAULT_WIDGET_COPY.startChatLabel,
        inputPlaceholder:
          values.widgetCopy.inputPlaceholder.trim() ||
          DEFAULT_WIDGET_COPY.inputPlaceholder,
        onlineLabel:
          values.widgetCopy.onlineLabel.trim() ||
          DEFAULT_WIDGET_COPY.onlineLabel,
      }
      const openaiRealtimeSettings = {
        enabled: Boolean(values.openaiRealtimeSettings.enabled),
        model: values.openaiRealtimeSettings.model.trim() || "gpt-realtime",
        voice: values.openaiRealtimeSettings.voice.trim() || "marin",
      }
      const geminiLiveSettings = {
        enabled: Boolean(values.geminiLiveSettings.enabled),
        model:
          values.geminiLiveSettings.model.trim() ||
          "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: values.geminiLiveSettings.voice.trim() || "Kore",
      }
      const voiceCallSettings = {
        autoEndOnGoodbye: Boolean(values.voiceCallSettings.autoEndOnGoodbye),
        idleTimeoutSeconds: Number(values.voiceCallSettings.idleTimeoutSeconds),
        maxDurationSeconds: Number(values.voiceCallSettings.maxDurationSeconds),
        customGoodbyePhrases: values.voiceCallSettings.customGoodbyePhrases
          .split("\n")
          .map((phrase) => phrase.trim())
          .filter(Boolean),
      }
      return {
        agentId,
        greetMessage: values.greetMessage,
        systemPrompt: values.systemPrompt.trim(),
        enabledToolIds: (values.enabledToolIds ?? undefined) as
          | Id<"assistantTools">[]
          | undefined,
        chatSettings: {
          model: values.chatSettings.model.trim() || defaultChatModel,
        },
        defaultSuggestions: values.defaultSuggestions,
        helpTopics: cleanHelpTopicsForSave(values.helpTopics),
        homeCards: cleanHomeCardsForSave(values.homeCards, values.helpTopics),
        openaiRealtimeSettings,
        geminiLiveSettings,
        voiceCallSettings,
        theme,
        appearance,
        widgetCopy,
      }
    },
    [agentId]
  )

  const markCurrentValuesAsSaved = useCallback(
    (values: FormSchema) => {
      form.reset(values, {
        keepValues: true,
      })
    },
    [form]
  )

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!form.formState.isDirty) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const isValid = await form.trigger()
      if (!isValid) return
      setAutoSaveStatus("saving")
      try {
        const values = form.getValues()
        await saveDraftWidgetSettings(buildMutationPayload(values))
        markCurrentValuesAsSaved(values)
        setAutoSaveStatus("saved")
        setTimeout(() => setAutoSaveStatus("idle"), 2000)
      } catch {
        setAutoSaveStatus("idle")
      }
    }, 2000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues])

  const onSaveDraft = async (values: FormSchema) => {
    try {
      await saveDraftWidgetSettings(buildMutationPayload(values))
      markCurrentValuesAsSaved(values)
      toast.success("Draft saved")
    } catch {
      toast.error("Unable to save draft")
    }
  }

  const onPublishDraft = form.handleSubmit(async (values) => {
    setIsPublishing(true)
    try {
      await saveDraftWidgetSettings(buildMutationPayload(values))
      const result = await publishDraftWidgetSettings({ agentId })
      markCurrentValuesAsSaved(values)
      toast.success(`Published version v${result.publishedVersion}`)
    } catch {
      toast.error("Unable to publish draft")
    } finally {
      setIsPublishing(false)
    }
  })

  const onRollback = async (targetVersion: number) => {
    if (!Number.isInteger(targetVersion) || targetVersion <= 0) {
      toast.error("Selected version is invalid")
      return
    }
    setIsRollingBack(true)
    try {
      const result = await rollbackWidgetSettingsVersion({
        agentId,
        version: targetVersion,
      })
      toast.success(
        `Rolled back to v${targetVersion}. New published version is v${result.publishedVersion}`
      )
      setIsReleaseDrawerOpen(false)
    } catch {
      toast.error("Unable to rollback version")
    } finally {
      setIsRollingBack(false)
    }
  }

  const onCopyEmbedLink = async () => {
    try {
      const url = `${window.location.origin}/widget-preview`
      await navigator.clipboard.writeText(url)
      toast.success("Embed preview link copied")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const onCopySettings = async () => {
    try {
      const payload = serializeWidgetSettingsExport(form.getValues())
      await navigator.clipboard.writeText(payload)
      toast.success("Widget settings copied to clipboard")
    } catch {
      toast.error("Failed to copy widget settings")
    }
  }

  const onOpenImportDialog = () => {
    setIsImportDialogOpen(true)

    if (importPayload.trim()) {
      return
    }

    void navigator.clipboard
      .readText()
      .then((clipboardText) => {
        if (clipboardText.trim()) {
          setImportPayload(clipboardText)
        }
      })
      .catch(() => {
        // User can paste manually if clipboard access is blocked.
      })
  }

  const onImportSettings = async () => {
    setIsImporting(true)

    try {
      const importedSettings = parseWidgetSettingsImport(importPayload)
      const mutationPayload = buildMutationPayload(importedSettings)

      await saveDraftWidgetSettings(mutationPayload)
      form.reset(importedSettings)
      markCurrentValuesAsSaved(importedSettings)
      setIsImportDialogOpen(false)
      setImportPayload("")

      if (hasConvexHostedImageUrl(importedSettings)) {
        toast.success("Settings imported as draft", {
          description:
            "Some images were uploaded to another environment. Re-upload logos and backgrounds if they do not appear.",
        })
      } else {
        toast.success("Settings imported as draft")
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import widget settings"
      )
    } finally {
      setIsImporting(false)
    }
  }

  const hasHelpTopics = helpTopicsArray.fields.length > 0

  const addHelpTopic = () => {
    helpTopicsArray.append(createHelpTopic(helpTopicsArray.fields.length + 1))
  }

  const removeHelpTopic = (topicIndex: number) => {
    const nextHomeCards = (form.getValues("homeCards") ?? []).reduce<
      FormSchema["homeCards"]
    >((cards, card) => {
      const currentTopicIndex = Number(card.topicIndex)
      if (!Number.isInteger(currentTopicIndex)) return cards
      if (currentTopicIndex === topicIndex) return cards

      cards.push({
        ...card,
        topicIndex:
          currentTopicIndex > topicIndex
            ? currentTopicIndex - 1
            : currentTopicIndex,
      })
      return cards
    }, [])

    homeCardsArray.replace(nextHomeCards)
    helpTopicsArray.remove(topicIndex)
  }

  const removeAllHelpContent = () => {
    homeCardsArray.replace([])
    helpTopicsArray.replace([])
  }

  const activeSection =
    SECTIONS.find((section) => section.id === activeTab) ?? SECTIONS[0]!

  return (
    <Form {...form}>
      <form
        className="grid gap-4 xl:grid-cols-[236px_minmax(0,1fr)_340px] xl:items-start"
        onSubmit={form.handleSubmit(onSaveDraft)}
      >
        <Tabs
          className="contents"
          onValueChange={(value) => setActiveTab(value as SectionId)}
          orientation="vertical"
          value={activeTab}
        >
          {/* ── section nav ─────────────────────────────────────────────── */}
          <aside className="animate-enter min-w-0 xl:sticky xl:top-4">
            <div className="console-card overflow-hidden">
              <div className="border-b border-[var(--console-hairline-soft)] px-3.5 py-3">
                <p className="console-eyebrow">Widget</p>
                <p className="console-numeral mt-1.5 text-sm">
                  v{publishedVersion}{" "}
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    live
                  </span>
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "console-dot",
                      isDraftDifferentFromPublished
                        ? "console-tone-warning"
                        : "console-tone-positive"
                    )}
                  />
                  {isDraftDifferentFromPublished
                    ? "Draft has unpublished changes"
                    : "Draft matches live"}
                </p>
              </div>

              <TabsList className="flex h-auto w-full flex-row gap-1 overflow-x-auto bg-transparent p-2 xl:flex-col">
                {SECTIONS.map((section) => (
                  <TabsTrigger
                    className={cn(
                      "group flex h-auto w-full shrink-0 items-start gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left",
                      "data-active:border-[var(--console-hairline-soft)] data-active:bg-muted/60 data-active:shadow-none"
                    )}
                    key={section.id}
                    value={section.id}
                  >
                    <span
                      className={cn(
                        "mt-px flex size-6 shrink-0 items-center justify-center rounded-[7px] border transition-colors",
                        "border-[var(--console-hairline-soft)] bg-background text-muted-foreground",
                        "group-data-active:border-primary/30 group-data-active:bg-primary/10 group-data-active:text-primary"
                      )}
                    >
                      <section.icon className="size-3.5" />
                    </span>
                    <span className="hidden min-w-0 flex-1 xl:block">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {section.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {sectionSummaries[section.id]}
                      </span>
                    </span>
                    <span className="text-xs font-medium xl:hidden">
                      {section.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="border-t border-[var(--console-hairline-soft)] p-2">
                <Button
                  className="h-8 w-full justify-start gap-2 text-xs"
                  disabled={isBusy}
                  onClick={() => setIsReleaseDrawerOpen(true)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <HistoryIcon className="size-3.5" />
                  Releases &amp; transfer
                </Button>
              </div>
            </div>
          </aside>

          {/* ── editor ──────────────────────────────────────────────────── */}
          <main className="animate-enter min-w-0 space-y-4">
            <section className="console-card overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--console-hairline-soft)] px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="console-medallion size-9 shrink-0">
                    <activeSection.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="console-section-title">
                      {activeSection.label}
                    </h2>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                      {activeSection.description}
                    </p>
                  </div>
                </div>
                <span className="console-label hidden shrink-0 sm:block">
                  Autosaved
                </span>
              </div>

              <div className="p-4 sm:p-6">
                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="behaviour"
                >
                  <SettingsGroup
                    description="The model that answers, and how much of your context it carries into every reply."
                    icon={BrainCircuitIcon}
                    title="Reasoning"
                  >
                    <FormField
                      control={form.control}
                      name="chatSettings.model"
                      render={({ field }) => {
                        const modelOptions = getSelectableChatModelOptions(
                          field.value
                        )
                        const selectedModel = modelOptions.find(
                          (model) => model.value === field.value
                        )

                        return (
                          <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                            <span className="text-xs font-medium text-foreground">
                              Chat response model
                            </span>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="mt-2.5 h-10 w-full bg-background px-3">
                                  <SelectValue placeholder="Select a chat model">
                                    {selectedModel?.label}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent
                                className="max-w-[min(560px,calc(100vw-2rem))]"
                                position="popper"
                              >
                                {modelOptions.map((model) => (
                                  <SelectItem
                                    className="items-start py-2.5 pr-9"
                                    key={model.value}
                                    textValue={model.label}
                                    value={model.value}
                                  >
                                    <span className="grid min-w-0 gap-0.5">
                                      <span className="truncate font-medium">
                                        {model.label}
                                      </span>
                                      <span className="text-xs leading-snug whitespace-normal text-muted-foreground">
                                        {model.description}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                              Used for widget chat replies with your saved
                              OpenAI key. Live voice models are set in the Voice
                              section.
                            </p>
                            <FormMessage className="mt-1.5" />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-foreground">
                              System prompt
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="console-numeral text-[10px] text-muted-foreground/70">
                                {systemPromptLen} chars
                              </span>
                              <span
                                className={cn(
                                  "console-numeral text-[10px]",
                                  tokenEstimate > 1000
                                    ? "console-tone-critical"
                                    : tokenEstimate > 500
                                      ? "console-tone-warning"
                                      : "text-muted-foreground/70"
                                )}
                              >
                                ~{tokenEstimate} tokens
                              </span>
                            </span>
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="mt-2.5 min-h-[220px] bg-background font-mono text-xs"
                              placeholder="Set the assistant's default behavior and rules"
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                            Sent with every customer conversation. Keep it
                            specific about tone, escalation and what the
                            assistant must never do.
                          </p>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </SettingsGroup>

                  <SettingsDivider />

                  <SettingsGroup
                    description="Actions the assistant can take mid-conversation. Definitions live in Assistant tools."
                    icon={WrenchIcon}
                    title="Tools"
                  >
                    <FormField
                      control={form.control}
                      name="enabledToolIds"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <FormControl>
                            <WidgetToolsPicker
                              onChange={field.onChange}
                              value={
                                field.value as
                                  | Id<"assistantTools">[]
                                  | undefined
                              }
                            />
                          </FormControl>
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                            Saved with the draft and applied when you publish.
                          </p>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </SettingsGroup>

                  <SettingsDivider />

                  <SettingsGroup
                    description="What a visitor can do with their own conversation history."
                    icon={SettingsIcon}
                    title="Transcript"
                  >
                    <FormField
                      control={form.control}
                      name="appearance.showChatHistoryDownload"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <SettingRow
                            control={
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            }
                            description="Adds a download button to the chat header so visitors can save the transcript."
                            label="Allow transcript download"
                          />
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </SettingsGroup>
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="copy"
                >
                  <CopyFormFields form={form} />
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="help"
                >
                  <SettingsGroup
                    description="Written answers the widget can show before anyone starts a conversation."
                    icon={FileTextIcon}
                    title="Availability"
                  >
                    <FormField
                      control={form.control}
                      name="appearance.showHelpCenter"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-0">
                          <SettingRow
                            control={
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            }
                            description="Hides the Help button, the search entry and the home cards without deleting any topics or articles."
                            label="Show the help centre in the widget"
                          />
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </SettingsGroup>

                  <SettingsDivider />

                  <SettingsGroup
                    actions={
                      <Button
                        className="h-8 gap-1.5 text-xs"
                        disabled={!hasHelpTopics}
                        onClick={() =>
                          homeCardsArray.append({
                            type: "article",
                            topicIndex: 0,
                            articleIndex: 0,
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        <PlusIcon className="size-3.5" />
                        Add card
                      </Button>
                    }
                    description="The topics or articles shown on the widget home screen, in order."
                    icon={LayoutGridIcon}
                    title="Home cards"
                  >
                    {hasHelpTopics ? (
                      <div className="grid gap-3">
                        {homeCardsArray.fields.map((homeCard, cardIndex) => {
                          const card = watchedValues.homeCards?.[cardIndex]
                          const topicIndex = Number(card?.topicIndex ?? 0)
                          const topic =
                            watchedValues.helpTopics?.[topicIndex] ??
                            watchedValues.helpTopics?.[0]

                          return (
                            <div
                              className="console-inset grid gap-3 p-3 md:grid-cols-[1fr_1fr_auto]"
                              key={homeCard.id}
                            >
                              <FormField
                                control={form.control}
                                name={`homeCards.${cardIndex}.topicIndex`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                      Topic
                                    </FormLabel>
                                    <Select
                                      onValueChange={(value) => {
                                        field.onChange(Number(value))
                                        form.setValue(
                                          `homeCards.${cardIndex}.articleIndex`,
                                          0,
                                          {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          }
                                        )
                                      }}
                                      value={String(field.value ?? 0)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="bg-card">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {watchedValues.helpTopics.map(
                                          (helpTopic, helpTopicIndex) => (
                                            <SelectItem
                                              key={`${helpTopic.title}-${helpTopicIndex}`}
                                              value={String(helpTopicIndex)}
                                            >
                                              {helpTopic.title ||
                                                `Topic ${helpTopicIndex + 1}`}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`homeCards.${cardIndex}.articleIndex`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                      Article
                                    </FormLabel>
                                    <Select
                                      onValueChange={(value) =>
                                        field.onChange(Number(value))
                                      }
                                      value={String(field.value ?? 0)}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="bg-card">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(topic?.articles ?? []).map(
                                          (article, articleIndex) => (
                                            <SelectItem
                                              key={`${article.title}-${articleIndex}`}
                                              value={String(articleIndex)}
                                            >
                                              {article.title ||
                                                `Article ${articleIndex + 1}`}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex items-end md:justify-end">
                                <Button
                                  className="h-10 gap-1.5 text-xs"
                                  disabled={homeCardsArray.fields.length <= 1}
                                  onClick={() =>
                                    homeCardsArray.remove(cardIndex)
                                  }
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash2Icon className="size-3.5" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="console-inset border-dashed px-4 py-5 text-center">
                        <p className="text-sm font-medium">
                          No help content yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Add a topic below to switch the help centre back on.
                        </p>
                      </div>
                    )}
                  </SettingsGroup>

                  <SettingsDivider />

                  <SettingsGroup
                    actions={
                      <>
                        <Button
                          className="h-8 gap-1.5 text-xs"
                          disabled={!hasHelpTopics}
                          onClick={removeAllHelpContent}
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-3.5" />
                          Remove all
                        </Button>
                        <Button
                          className="h-8 gap-1.5 text-xs"
                          onClick={addHelpTopic}
                          type="button"
                          variant="outline"
                        >
                          <PlusIcon className="size-3.5" />
                          Add topic
                        </Button>
                      </>
                    }
                    description={`${helpTopicsArray.fields.length} topic${helpTopicsArray.fields.length === 1 ? "" : "s"} in the library. Each topic holds one or more formatted articles.`}
                    icon={LibraryIcon}
                    title="Topics and articles"
                  >
                  {hasHelpTopics ? (
                    <div className="grid gap-5">
                      {helpTopicsArray.fields.map((topicField, topicIndex) => (
                        <HelpTopicEditor
                          canRemoveTopic
                          form={form}
                          key={topicField.id}
                          onRemoveTopic={() => removeHelpTopic(topicIndex)}
                          topicIndex={topicIndex}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="console-inset border-dashed px-5 py-8 text-center">
                      <p className="text-sm font-semibold">
                        No help topics or articles
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        The widget Help button stays disabled until a topic has
                        at least one article.
                      </p>
                      <Button
                        className="mt-4 h-8 gap-1.5 text-xs"
                        onClick={addHelpTopic}
                        type="button"
                        variant="outline"
                      >
                        <PlusIcon className="size-3.5" />
                        Add topic
                      </Button>
                    </div>
                  )}
                  </SettingsGroup>
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="brand"
                >
                  <ThemeFormFields form={form} />
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="launcher"
                >
                  <AppearanceFormFields form={form} />
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="voice"
                >
                  <SettingsGroup
                    description="When a live voice provider is enabled, the published widget opens straight into a voice-only assistant."
                    icon={MicIcon}
                    title="Live voice"
                  >
                    <SettingsNotice
                      icon={MicIcon}
                      title="Live voice replaces the chat surface"
                      tone="accent"
                    >
                      Visitors are stored as an anonymous voice visitor, the
                      regular chat view is hidden, and final transcript lines
                      are saved under AI voice chats.
                    </SettingsNotice>

                    <FormField
                      control={form.control}
                      name="appearance.voiceLauncherLabel"
                      render={({ field }) => (
                        <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
                          <span className="text-xs font-medium text-foreground">
                            Voice launcher text
                          </span>
                          <FormControl>
                            <Input
                              {...field}
                              className="mt-2.5 h-9 bg-background"
                              placeholder="Talk with us"
                            />
                          </FormControl>
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                            Shown beside the animated voice orb when live voice
                            opens the widget directly.
                          </p>
                          <FormMessage className="mt-1.5" />
                        </FormItem>
                      )}
                    />
                  </SettingsGroup>

                  <SettingsDivider />

                  <OpenAIRealtimeFormFields form={form} />

                  <SettingsDivider />

                  <VoiceCallSettingsFormFields form={form} />
                </TabsContent>
              </div>
            </section>

            <div className="xl:hidden">
              <WidgetLivePreview
                appearance={previewAppearance}
                copy={previewCopy}
                greetMessage={watchedValues.greetMessage}
                suggestions={previewSuggestions}
                theme={previewTheme}
                voiceOnly={previewVoiceOnly}
              />
            </div>

            {/* ── action bar ────────────────────────────────────────────── */}
            <div className="sticky bottom-0 z-10 sm:bottom-4">
              <div className="console-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[var(--console-shadow-lift)] sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  {autoSaveStatus === "saving" ? (
                    <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "console-dot",
                        autoSaveStatus === "saved" || !form.formState.isDirty
                          ? "console-tone-positive"
                          : "console-tone-warning"
                      )}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-none font-medium">
                      {autoSaveStatus === "saving"
                        ? "Saving…"
                        : autoSaveStatus === "saved"
                          ? "Draft saved"
                          : form.formState.isDirty
                            ? "Unsaved changes"
                            : "All changes saved"}
                    </p>
                    <p className="mt-1 hidden truncate text-[11px] text-muted-foreground sm:block">
                      {isDraftDifferentFromPublished
                        ? "Publish to push this draft to your customers"
                        : "Live and draft are identical"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  <Button
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={onCopyEmbedLink}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <LinkIcon className="size-3.5" />
                    Preview link
                  </Button>
                  <Button
                    className="gap-1.5"
                    disabled={isBusy}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    <SaveIcon className="size-3.5" />
                    {form.formState.isSubmitting && !isPublishing
                      ? "Saving…"
                      : "Save draft"}
                  </Button>
                  <Button
                    className={cn(
                      "gap-1.5 transition-all duration-300",
                      isDraftDifferentFromPublished &&
                        "shadow-[0_20px_40px_-24px_color-mix(in_srgb,var(--primary)_80%,transparent)] ring-2 ring-primary/25"
                    )}
                    disabled={isBusy}
                    onClick={onPublishDraft}
                    size="sm"
                    type="button"
                  >
                    <SendIcon className="size-3.5" />
                    {isPublishing ? "Publishing…" : "Publish"}
                    {isDraftDifferentFromPublished ? (
                      <ChevronRightIcon className="size-3" />
                    ) : null}
                  </Button>
                </div>
              </div>
            </div>
          </main>

          {/* ── preview ─────────────────────────────────────────────────── */}
          <div className="hidden xl:block">
            <div className="xl:animate-pop xl:sticky xl:top-4">
              <WidgetLivePreview
                appearance={previewAppearance}
                copy={previewCopy}
                greetMessage={watchedValues.greetMessage}
                suggestions={previewSuggestions}
                theme={previewTheme}
                voiceOnly={previewVoiceOnly}
              />
            </div>
          </div>
        </Tabs>
      </form>

      <ReleaseDrawer
        draftUpdatedAt={draftUpdatedAt}
        formatRelativeTime={formatRelativeTime}
        isBusy={isBusy}
        isRollingBack={isRollingBack}
        onCopySettings={onCopySettings}
        onImportSettings={onOpenImportDialog}
        onOpenChange={setIsReleaseDrawerOpen}
        onRollback={onRollback}
        open={isReleaseDrawerOpen}
        publishedAt={publishedAt}
        publishedVersion={publishedVersion}
        versions={versions}
      />

      <Dialog onOpenChange={setIsImportDialogOpen} open={isImportDialogOpen}>
        <DialogContent className="!flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import widget settings</DialogTitle>
            <DialogDescription>
              Paste settings copied from another org or environment. This
              replaces the current draft for this organization.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="h-[min(42vh,360px)] field-sizing-fixed resize-none overflow-y-auto font-mono text-xs"
            onChange={(event) => setImportPayload(event.target.value)}
            placeholder='Paste exported JSON here, e.g. {"type":"osonflow-widget-settings",...}'
            value={importPayload}
          />
          <DialogFooter>
            <Button
              disabled={isImporting}
              onClick={() => setIsImportDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isImporting || !importPayload.trim()}
              onClick={onImportSettings}
              type="button"
            >
              {isImporting ? "Importing…" : "Import draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
