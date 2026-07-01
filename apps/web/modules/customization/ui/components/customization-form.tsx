import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import {
  useFieldArray,
  useForm,
  type Path,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  ClockIcon,
  BoldIcon,
  FileTextIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  MicIcon,
  PaletteIcon,
  PlusIcon,
  QuoteIcon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
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
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  clampBorderRadius,
  clampLauncherPromptDelaySeconds,
  DEFAULT_WIDGET_APPEARANCE,
  mergeWidgetAppearance,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"
import {
  richTextStorageToHtml,
  sanitizeRichTextHtml,
} from "@workspace/ui/lib/rich-text"
import { cn } from "@workspace/ui/lib/utils"
import { Doc } from "@workspace/backend/_generated/dataModel"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { VapiFormFields } from "./vapi-form-fields"
import { OpenAIRealtimeFormFields } from "./openai-realtime-form-fields"
import { ThemeFormFields } from "./theme-form-fields"
import { AppearanceFormFields } from "./appearance-form-fields"
import { WidgetLivePreview } from "./widget-live-preview"
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
  | "defaultSuggestions"
  | "helpTopics"
  | "homeCards"
  | "vapiSettings"
  | "theme"
  | "appearance"
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
}

type WidgetSettingsVersionSummary = {
  version: number
  publishedAt: number
  publishedBy?: string
  action: "publish" | "rollback" | "bootstrap"
  sourceVersion?: number
}

interface CustomizationFormProps {
  draftData: WidgetSettingsSnapshot
  publishedVersion: number
  publishedAt?: number
  draftUpdatedAt?: number
  isDraftDifferentFromPublished: boolean
  versions: WidgetSettingsVersionSummary[]
  hasVapiPlugin: boolean
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
    vapiSettings: {
      assistantId: snapshot.vapiSettings.assistantId || "",
      phoneNumber: snapshot.vapiSettings.phoneNumber || "",
    },
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
    theme: defaultTheme,
    appearance: defaultAppearance,
  }
}

const describeVersionAction = (version: WidgetSettingsVersionSummary) => {
  if (version.action === "rollback") {
    return version.sourceVersion
      ? `Rolled back to v${version.sourceVersion}`
      : "Rollback"
  }
  if (version.action === "bootstrap") return "Initial baseline"
  return "Published draft"
}

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "Not available"
  return `${formatDistanceToNow(timestamp)} ago`
}

const suggestionFieldConfig = [
  {
    name: "defaultSuggestions.suggestion1" as const,
    label: "Suggestion 1",
    placeholder: "e.g. How do I get started?",
  },
  {
    name: "defaultSuggestions.suggestion2" as const,
    label: "Suggestion 2",
    placeholder: "e.g. What are your pricing plans?",
  },
  {
    name: "defaultSuggestions.suggestion3" as const,
    label: "Suggestion 3",
    placeholder: "e.g. I need help with my account",
  },
]

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
    <div className="overflow-hidden rounded-lg border border-input bg-background/70">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-muted/30 p-1.5">
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
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
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
                className="bg-background/70"
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
                className="resize-none bg-background/70"
                placeholder="Short preview shown on the Home card"
                rows={2}
                value={typeof field.value === "string" ? field.value : ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3 border-t border-border/70 pt-4">
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
              className="space-y-3 rounded-xl border border-border/60 bg-background/55 p-3"
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
                        className="bg-background/70"
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
                        className="resize-none bg-background/70"
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

export const CustomizationForm = ({
  draftData,
  publishedVersion,
  publishedAt,
  draftUpdatedAt,
  isDraftDifferentFromPublished,
  versions,
  hasVapiPlugin,
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
  const [importPayload, setImportPayload] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rollbackCandidates = useMemo(
    () => versions.filter((v) => v.version !== publishedVersion),
    [versions, publishedVersion]
  )

  const [selectedRollbackVersion, setSelectedRollbackVersion] =
    useState<string>(rollbackCandidates[0]?.version.toString() ?? "")

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
  const previewSuggestions = [
    watchedValues.defaultSuggestions?.suggestion1,
    watchedValues.defaultSuggestions?.suggestion2,
    watchedValues.defaultSuggestions?.suggestion3,
  ].filter((s): s is string => Boolean(s))
  const previewVoiceOnly = Boolean(
    watchedValues.openaiRealtimeSettings?.enabled ||
    watchedValues.geminiLiveSettings?.enabled
  )

  const recentVersions = useMemo(() => versions.slice(0, 6), [versions])
  const isBusy = form.formState.isSubmitting || isPublishing || isRollingBack

  const charCount = watchedValues.greetMessage?.length ?? 0
  const systemPromptLen = watchedValues.systemPrompt?.length ?? 0
  const tokenEstimate = Math.ceil(systemPromptLen / 4)

  const buildMutationPayload = useCallback((values: FormSchema) => {
    const vapiSettings: WidgetSettings["vapiSettings"] = {
      assistantId:
        values.vapiSettings.assistantId === "none"
          ? ""
          : values.vapiSettings.assistantId,
      phoneNumber:
        values.vapiSettings.phoneNumber === "none"
          ? ""
          : values.vapiSettings.phoneNumber,
    }
    const theme: NonNullable<WidgetSettings["theme"]> = {
      ...values.theme,
      borderRadius: clampBorderRadius(Number(values.theme.borderRadius)),
      logoUrl: values.theme.logoUrl.trim(),
      backgroundImageUrl: values.theme.backgroundImageUrl.trim(),
      assistantName: values.theme.assistantName.trim(),
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
    return {
      greetMessage: values.greetMessage,
      systemPrompt: values.systemPrompt.trim(),
      chatSettings: {
        model: values.chatSettings.model.trim() || defaultChatModel,
      },
      defaultSuggestions: values.defaultSuggestions,
      helpTopics: cleanHelpTopicsForSave(values.helpTopics),
      homeCards: cleanHomeCardsForSave(values.homeCards, values.helpTopics),
      vapiSettings,
      openaiRealtimeSettings,
      geminiLiveSettings,
      theme,
      appearance,
    }
  }, [])

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
      const result = await publishDraftWidgetSettings({})
      markCurrentValuesAsSaved(values)
      toast.success(`Published version v${result.publishedVersion}`)
    } catch {
      toast.error("Unable to publish draft")
    } finally {
      setIsPublishing(false)
    }
  })

  const onRollback = async () => {
    if (!selectedRollbackVersion) {
      toast.error("Select a version to rollback to")
      return
    }
    const targetVersion = Number(selectedRollbackVersion)
    if (!Number.isInteger(targetVersion) || targetVersion <= 0) {
      toast.error("Selected version is invalid")
      return
    }
    setIsRollingBack(true)
    try {
      const result = await rollbackWidgetSettingsVersion({
        version: targetVersion,
      })
      toast.success(
        `Rolled back to v${targetVersion}. New published version is v${result.publishedVersion}`
      )
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

  const onOpenImportDialog = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setImportPayload(clipboardText)
    } catch {
      setImportPayload("")
    }

    setIsImportDialogOpen(true)
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

  const canRollback =
    rollbackCandidates.length > 0 && selectedRollbackVersion !== ""
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

  return (
    <Form {...form}>
      <form
        className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_380px] xl:items-start"
        onSubmit={form.handleSubmit(onSaveDraft)}
      >
        <Tabs
          className="contents"
          orientation="vertical"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <aside className="surface-sidebar animate-enter min-w-0 rounded-[22px] p-3 xl:sticky xl:top-4">
            <div className="px-1 py-1">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                Builder
              </p>
              <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                Widget settings
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                Configure behavior, brand, launcher, and voice in one place.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar-accent/55">
              <div className="border-r border-sidebar-border/70 px-3 py-2">
                <p className="text-[10px] font-medium text-sidebar-foreground/48 uppercase">
                  Live
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  v{publishedVersion}
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="text-[10px] font-medium text-sidebar-foreground/48 uppercase">
                  Draft
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {isDraftDifferentFromPublished ? "Changed" : "Current"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge className="gap-1.5 text-xs" variant="secondary">
                <CheckCircle2Icon className="size-3" />
                Published
              </Badge>
              <Badge
                className="gap-1.5 text-xs"
                variant={isDraftDifferentFromPublished ? "default" : "outline"}
              >
                {isDraftDifferentFromPublished ? (
                  <>
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-amber-400" />
                    Unpublished
                  </>
                ) : (
                  <>
                    <span className="inline-block size-1.5 rounded-full bg-green-400" />
                    Up to date
                  </>
                )}
              </Badge>
            </div>

            <TabsList className="mt-4 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-1 xl:flex xl:flex-col">
              <TabsTrigger
                className="h-10 justify-start rounded-xl px-3 text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm"
                value="chat"
              >
                <MessageSquareTextIcon className="size-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                className="h-10 justify-start rounded-xl px-3 text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm"
                value="help"
              >
                <FileTextIcon className="size-3.5" />
                Help Center
              </TabsTrigger>
              <TabsTrigger
                className="h-10 justify-start rounded-xl px-3 text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm"
                value="brand"
              >
                <PaletteIcon className="size-3.5" />
                Brand Kit
              </TabsTrigger>
              <TabsTrigger
                className="h-10 justify-start rounded-xl px-3 text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm"
                value="appearance"
              >
                <SparklesIcon className="size-3.5" />
                Appearance
              </TabsTrigger>
              <TabsTrigger
                className="h-10 justify-start rounded-xl px-3 text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm"
                value="voice"
              >
                <MicIcon className="size-3.5" />
                Voice
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-3 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-3.5 text-sidebar-foreground/50" />
                <p className="text-xs font-semibold text-sidebar-foreground">
                  Release
                </p>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-sidebar-foreground/46 uppercase">
                    Last published
                  </p>
                  <p className="mt-0.5 truncate font-medium">
                    {formatRelativeTime(publishedAt)}
                  </p>
                </div>
                <div className="rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
                  <p className="text-[10px] font-medium text-sidebar-foreground/46 uppercase">
                    Draft saved
                  </p>
                  <p className="mt-0.5 truncate font-medium">
                    {formatRelativeTime(draftUpdatedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
              <div className="flex items-center gap-2">
                <RotateCcwIcon className="size-3.5 text-sidebar-foreground/50" />
                <p className="text-xs font-semibold text-sidebar-foreground">
                  Rollback
                </p>
              </div>
              <Select
                disabled={isBusy || rollbackCandidates.length === 0}
                onValueChange={setSelectedRollbackVersion}
                value={selectedRollbackVersion}
              >
                <SelectTrigger className="h-9 w-full border-sidebar-border/70 bg-sidebar-accent/70 text-xs">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {rollbackCandidates.map((v) => (
                    <SelectItem key={v.version} value={v.version.toString()}>
                      v{v.version} - {describeVersionAction(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="h-8 w-full gap-1.5 text-xs"
                disabled={!canRollback || isBusy}
                onClick={onRollback}
                size="sm"
                type="button"
                variant="outline"
              >
                <RotateCcwIcon className="size-3.5" />
                {isRollingBack ? "Rolling back..." : "Rollback"}
              </Button>
              {rollbackCandidates.length === 0 ? (
                <p className="text-[11px] text-sidebar-foreground/55">
                  Publish an update to enable rollback.
                </p>
              ) : null}
            </div>

            <div className="mt-3 space-y-2 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
              <div className="flex items-center gap-2">
                <ClipboardCopyIcon className="size-3.5 text-sidebar-foreground/50" />
                <p className="text-xs font-semibold text-sidebar-foreground">
                  Transfer
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
                Copy settings from this org and paste them into another org or
                environment. For knowledge base and API keys, use{" "}
                <a className="underline" href="/org-transfer">
                  Data transfer
                </a>
                .
              </p>
              <div className="grid gap-2">
                <Button
                  className="h-8 w-full gap-1.5 text-xs"
                  disabled={isBusy}
                  onClick={onCopySettings}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ClipboardCopyIcon className="size-3.5" />
                  Copy settings
                </Button>
                <Button
                  className="h-8 w-full gap-1.5 text-xs"
                  disabled={isBusy}
                  onClick={onOpenImportDialog}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ClipboardPasteIcon className="size-3.5" />
                  Import settings
                </Button>
              </div>
            </div>

            {recentVersions.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                <p className="text-[10px] font-semibold tracking-[0.1em] text-sidebar-foreground/50 uppercase">
                  Version history
                </p>
                <div className="space-y-1.5">
                  {recentVersions.slice(0, 4).map((version) => (
                    <div
                      className={cn(
                        "rounded-lg border px-2.5 py-2",
                        version.version === publishedVersion
                          ? "border-sidebar-primary/25 bg-sidebar-primary/10"
                          : "border-sidebar-border/60 bg-sidebar-accent/45"
                      )}
                      key={version.version}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold">
                          v{version.version}
                        </span>
                        <span className="truncate text-[10px] text-sidebar-foreground/48">
                          {formatRelativeTime(version.publishedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/58">
                        {describeVersionAction(version)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <main className="animate-enter min-w-0 space-y-4">
            <section className="surface-panel overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                    <SettingsIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Editor
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      Widget configuration
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Update the customer-facing widget without changing embed
                      code.
                    </p>
                  </div>
                </div>
                <Badge
                  className="hidden text-xs sm:inline-flex"
                  variant="outline"
                >
                  Auto-save on
                </Badge>
              </div>

              <div className="p-4 sm:p-5">
                <TabsContent
                  className="mt-0 animate-in space-y-6 duration-200 fade-in-0 slide-in-from-right-2"
                  value="chat"
                >
                  <FormField
                    control={form.control}
                    name="greetMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Greeting Message
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="resize-none bg-muted/20"
                            placeholder="Welcome message shown when chat opens"
                            rows={3}
                          />
                        </FormControl>
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                          <FormDescription className="text-xs">
                            The first message customers see when they open the
                            chat
                          </FormDescription>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              charCount > 280
                                ? "text-destructive"
                                : "text-muted-foreground/60"
                            )}
                          >
                            {charCount}/300
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Chat Response Model
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 w-full bg-muted/20 px-3">
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
                          <FormDescription className="text-xs leading-relaxed">
                            Used for regular widget chat replies with your saved
                            OpenAI API key. Live voice models stay in the Voice
                            tab.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="appearance.showChatHistoryDownload"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3.5">
                        <div className="flex min-w-0 flex-col gap-1">
                          <FormLabel className="text-sm font-semibold">
                            Chat History Download
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Show the download button in widget conversations so
                            users can save their transcript.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          System Prompt
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-[220px] bg-muted/20 font-mono text-xs"
                            placeholder="Set the assistant's default behavior and rules"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                          <FormDescription className="text-xs">
                            Controls how the AI assistant behaves for customer
                            conversations.
                          </FormDescription>
                          <div className="flex items-center gap-3 sm:ml-2 sm:shrink-0">
                            <span className="text-xs text-muted-foreground/60 tabular-nums">
                              {systemPromptLen} chars
                            </span>
                            <span
                              className={cn(
                                "text-xs tabular-nums",
                                tokenEstimate > 1000
                                  ? "text-destructive"
                                  : tokenEstimate > 500
                                    ? "text-amber-500"
                                    : "text-muted-foreground/60"
                              )}
                            >
                              ~{tokenEstimate} tokens
                            </span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">
                        Default Suggestions
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Quick reply chips to guide the first interaction
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {suggestionFieldConfig.map((suggestionField, index) => (
                        <FormField
                          control={form.control}
                          key={suggestionField.name}
                          name={suggestionField.name}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/10 px-3 py-2.5">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium text-muted-foreground">
                                  {index + 1}
                                </div>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                    placeholder={suggestionField.placeholder}
                                  />
                                </FormControl>
                                <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground/50 tabular-nums">
                                  {field.value?.length ?? 0}/80
                                </span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in space-y-5 duration-200 fade-in-0 slide-in-from-right-2"
                  value="help"
                >
                  <div>
                    <h3 className="text-sm font-medium">
                      Help Topics and Articles
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Choose which help cards appear on Home, then manage the
                      full topic and article library below.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="appearance.showHelpCenter"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3.5">
                        <div className="flex min-w-0 flex-col gap-1">
                          <FormLabel className="text-sm font-semibold">
                            Show Help Center in widget
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Hide the Help button, search entry, and help cards
                            without deleting topics or articles.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Home cards</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Pick the topics or direct articles shown on the widget
                          Home screen.
                        </p>
                      </div>
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
                        Add Home card
                      </Button>
                    </div>

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
                              className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-3 md:grid-cols-[1fr_1fr_auto]"
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
                                        <SelectTrigger className="bg-background/80">
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
                                        <SelectTrigger className="bg-background/80">
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
                      <div className="rounded-xl border border-dashed border-border/80 bg-background/50 px-4 py-5 text-center">
                        <p className="text-sm font-medium">
                          Help Center is removed
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Add a topic to enable Help in the widget again.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/10 p-3">
                    <div>
                      <p className="text-xs font-semibold">
                        {helpTopicsArray.fields.length} topic
                        {helpTopicsArray.fields.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Add, remove, and format the full help center content.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                    </div>
                  </div>

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
                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-5 py-8 text-center">
                      <p className="text-sm font-semibold">
                        No help topics or articles
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        The widget Help button stays disabled until you add a
                        topic with at least one article.
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
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="brand"
                >
                  <ThemeFormFields form={form} />
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="appearance"
                >
                  <AppearanceFormFields form={form} />
                </TabsContent>

                <TabsContent
                  className="mt-0 animate-in space-y-6 duration-200 fade-in-0 slide-in-from-right-2"
                  value="voice"
                >
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Live voice mode
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      When OpenAI Realtime or Gemini Live is enabled, the
                      published widget opens as a voice-only assistant. It skips
                      name/email collection, hides the regular chat view, and
                      saves final transcript lines in AI voicechats.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="appearance.voiceLauncherLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Voice Launcher Text
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-muted/20"
                            placeholder="Talk with us"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Text shown next to the animated voice orb. This only
                          applies when live voice opens the widget directly.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <OpenAIRealtimeFormFields form={form} />
                  {hasVapiPlugin ? (
                    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
                      <div>
                        <p className="text-sm font-semibold">Vapi voice</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Keep using your existing Vapi assistant or phone
                          number alongside OpenAI voice.
                        </p>
                      </div>
                      <VapiFormFields form={form} />
                    </div>
                  ) : null}
                </TabsContent>
              </div>
            </section>

            <div className="xl:hidden">
              <WidgetLivePreview
                appearance={previewAppearance}
                greetMessage={watchedValues.greetMessage}
                suggestions={previewSuggestions}
                theme={previewTheme}
                voiceOnly={previewVoiceOnly}
              />
            </div>

            <div className="sticky bottom-0 z-10 sm:bottom-4">
              <div className="surface-frosted flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-0 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  {autoSaveStatus === "saving" ? (
                    <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
                  ) : (
                    <div
                      className={cn(
                        "size-2.5 rounded-full transition-colors duration-300",
                        autoSaveStatus === "saved"
                          ? "bg-green-500"
                          : form.formState.isDirty
                            ? "animate-pulse bg-amber-400"
                            : "bg-green-500"
                      )}
                    />
                  )}
                  <div>
                    <p className="text-sm leading-none font-medium">
                      {autoSaveStatus === "saving"
                        ? "Auto-saving..."
                        : autoSaveStatus === "saved"
                          ? "Auto-saved"
                          : form.formState.isDirty
                            ? "Unsaved changes"
                            : "All changes saved"}
                    </p>
                    <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                      {isDraftDifferentFromPublished
                        ? "Draft differs from published version"
                        : "Draft matches published version"}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <Button
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={onCopySettings}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <ClipboardCopyIcon className="size-3.5" />
                    Copy settings
                  </Button>
                  <Button
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={onOpenImportDialog}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <ClipboardPasteIcon className="size-3.5" />
                    Import
                  </Button>
                  <Button
                    className="gap-1.5"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={onCopyEmbedLink}
                    disabled={isBusy}
                  >
                    <LinkIcon className="size-3.5" />
                    Copy Link
                  </Button>
                  <Button
                    className="w-full gap-1.5 sm:w-auto"
                    disabled={isBusy}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    <SaveIcon className="size-3.5" />
                    {form.formState.isSubmitting && !isPublishing
                      ? "Saving..."
                      : "Save Draft"}
                  </Button>
                  <Button
                    className={cn(
                      "w-full gap-1.5 transition-all duration-300 sm:w-auto",
                      isDraftDifferentFromPublished
                        ? "shadow-[0_20px_40px_-24px_color-mix(in_srgb,var(--primary)_80%,transparent)] ring-2 ring-primary/25"
                        : ""
                    )}
                    disabled={isBusy}
                    onClick={onPublishDraft}
                    size="sm"
                    type="button"
                  >
                    <SendIcon className="size-3.5" />
                    {isPublishing ? "Publishing..." : "Publish"}
                    {isDraftDifferentFromPublished && (
                      <ChevronRightIcon className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </main>

          <div className="hidden xl:block">
            <div className="xl:animate-pop xl:sticky xl:top-4">
              <WidgetLivePreview
                appearance={previewAppearance}
                greetMessage={watchedValues.greetMessage}
                suggestions={previewSuggestions}
                theme={previewTheme}
                voiceOnly={previewVoiceOnly}
              />
            </div>
          </div>
        </Tabs>
      </form>

      <Dialog onOpenChange={setIsImportDialogOpen} open={isImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import widget settings</DialogTitle>
            <DialogDescription>
              Paste settings copied from another org or environment. This
              replaces the current draft for this organization.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[280px] font-mono text-xs"
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
              {isImporting ? "Importing..." : "Import draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
