import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import { useForm } from "react-hook-form"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  LinkIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  MicIcon,
  PaletteIcon,
  RotateCcwIcon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  clampBorderRadius,
  DEFAULT_WIDGET_APPEARANCE,
  mergeWidgetAppearance,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"
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

type WidgetSettings = Doc<"widgetSettings">
type WidgetSettingsSnapshot = Pick<
  WidgetSettings,
  | "greetMessage"
  | "systemPrompt"
  | "defaultSuggestions"
  | "vapiSettings"
  | "theme"
  | "appearance"
> & {
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

const buildFormDefaultValues = (
  snapshot: WidgetSettingsSnapshot
): FormSchema => {
  const defaultTheme = mergeWidgetTheme(snapshot.theme)
  const defaultAppearance = mergeWidgetAppearance(snapshot.appearance)
  return {
    greetMessage: snapshot.greetMessage || "Hi! How can I help you today?",
    systemPrompt: snapshot.systemPrompt || "",
    defaultSuggestions: {
      suggestion1: snapshot.defaultSuggestions.suggestion1 || "",
      suggestion2: snapshot.defaultSuggestions.suggestion2 || "",
      suggestion3: snapshot.defaultSuggestions.suggestion3 || "",
    },
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

type AutoSaveStatus = "idle" | "saving" | "saved"

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
  const [activeTab, setActiveTab] = useState("chat")
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rollbackCandidates = useMemo(
    () => versions.filter((v) => v.version !== publishedVersion),
    [versions, publishedVersion]
  )

  const [selectedRollbackVersion, setSelectedRollbackVersion] =
    useState<string>(rollbackCandidates[0]?.version.toString() ?? "")

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: buildFormDefaultValues(draftData),
  })

  const watchedValues = form.watch()
  const previewTheme = mergeWidgetTheme(watchedValues.theme)
  const previewAppearance = mergeWidgetAppearance(watchedValues.appearance)
  const previewSuggestions = [
    watchedValues.defaultSuggestions?.suggestion1,
    watchedValues.defaultSuggestions?.suggestion2,
    watchedValues.defaultSuggestions?.suggestion3,
  ].filter((s): s is string => Boolean(s))

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
      assistantName: values.theme.assistantName.trim(),
    }
    const appearance: NonNullable<WidgetSettings["appearance"]> = {
      ...values.appearance,
      launcherLabel:
        values.appearance.launcherLabel.trim() ||
        DEFAULT_WIDGET_APPEARANCE.launcherLabel,
      launcherIconUrl: values.appearance.launcherIconUrl.trim(),
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
      defaultSuggestions: values.defaultSuggestions,
      vapiSettings,
      openaiRealtimeSettings,
      geminiLiveSettings,
      theme,
      appearance,
    }
  }, [])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!form.formState.isDirty) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const isValid = await form.trigger()
      if (!isValid) return
      setAutoSaveStatus("saving")
      try {
        await saveDraftWidgetSettings(buildMutationPayload(form.getValues()))
        form.reset(form.getValues(), { keepDirty: false })
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
      form.reset(values, { keepDirty: false })
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
      form.reset(values, { keepDirty: false })
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

  const canRollback =
    rollbackCandidates.length > 0 && selectedRollbackVersion !== ""

  return (
    <Form {...form}>
      <form
        className="space-y-6 xl:relative xl:pr-[384px]"
        onSubmit={form.handleSubmit(onSaveDraft)}
      >
        <div className="min-w-0 space-y-5">
          {/* Release Workflow */}
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
                  <ClockIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Release Workflow</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Save drafts, publish when ready, and rollback quickly
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              {/* Status row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5 text-xs" variant="secondary">
                  <CheckCircle2Icon className="size-3" />
                  Published v{publishedVersion}
                </Badge>
                <Badge
                  className="gap-1.5 text-xs"
                  variant={
                    isDraftDifferentFromPublished ? "default" : "outline"
                  }
                >
                  {isDraftDifferentFromPublished ? (
                    <>
                      <span className="inline-block size-1.5 animate-pulse rounded-full bg-amber-400" />
                      Unpublished changes
                    </>
                  ) : (
                    <>
                      <span className="inline-block size-1.5 rounded-full bg-green-400" />
                      Up to date
                    </>
                  )}
                </Badge>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="mb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Last Published
                  </p>
                  <p className="text-sm font-medium">
                    {formatRelativeTime(publishedAt)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="mb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Last Draft Save
                  </p>
                  <p className="text-sm font-medium">
                    {formatRelativeTime(draftUpdatedAt)}
                  </p>
                </div>
              </div>

              {/* Rollback */}
              <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                <div className="flex items-center gap-2">
                  <RotateCcwIcon className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Rollback to a version</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    disabled={isBusy || rollbackCandidates.length === 0}
                    onValueChange={setSelectedRollbackVersion}
                    value={selectedRollbackVersion}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {rollbackCandidates.map((v) => (
                        <SelectItem
                          key={v.version}
                          value={v.version.toString()}
                        >
                          v{v.version} — {describeVersionAction(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="gap-1.5"
                    disabled={!canRollback || isBusy}
                    onClick={onRollback}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    {isRollingBack ? "Rolling back..." : "Rollback"}
                  </Button>
                </div>
                {rollbackCandidates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Publish at least one update to enable rollback.
                  </p>
                )}
              </div>

              {/* Version timeline */}
              {recentVersions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Version History
                  </p>
                  <div className="relative pl-4">
                    {/* Vertical line */}
                    <div className="absolute top-2 bottom-2 left-1.5 w-px bg-border" />
                    {recentVersions.map((version) => (
                      <div
                        key={version.version}
                        className="relative mb-2.5 last:mb-0"
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute top-[7px] -left-[11px] size-3 rounded-full border-2 border-background transition-all duration-200",
                            version.version === publishedVersion
                              ? "bg-green-500 shadow-sm shadow-green-500/50"
                              : "bg-muted-foreground/30"
                          )}
                        />
                        <div
                          className={cn(
                            "rounded-lg border px-3 py-2 transition-all duration-200",
                            version.version === publishedVersion
                              ? "border-primary/20 bg-primary/5"
                              : "bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold">
                                v{version.version}
                              </span>
                              {version.version === publishedVersion && (
                                <Badge
                                  className="h-4 px-1 text-[9px]"
                                  variant="secondary"
                                >
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60">
                              {formatRelativeTime(version.publishedAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {describeVersionAction(version)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget Configuration */}
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
                  <SettingsIcon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Widget Configuration
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Edit chat behavior, branding, launcher style, and voice
                    settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <Tabs
                className="space-y-4 sm:space-y-5"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-xl bg-muted/50 p-1">
                  <TabsTrigger
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    value="chat"
                  >
                    <MessageSquareTextIcon className="size-3.5" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    value="brand"
                  >
                    <PaletteIcon className="size-3.5" />
                    Brand Kit
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    value="appearance"
                  >
                    <SparklesIcon className="size-3.5" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    value="voice"
                  >
                    <MicIcon className="size-3.5" />
                    Voice
                  </TabsTrigger>
                </TabsList>

                {/* Chat Tab */}
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
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          System Prompt
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-[180px] bg-muted/20 font-mono text-xs"
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
                    <div className="space-y-3">
                      {suggestionFieldConfig.map((suggestionField, index) => (
                        <FormField
                          control={form.control}
                          key={suggestionField.name}
                          name={suggestionField.name}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-3">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                  {index + 1}
                                </div>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="bg-muted/20"
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

                {/* Brand Kit Tab */}
                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="brand"
                >
                  <ThemeFormFields form={form} />
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent
                  className="mt-0 animate-in duration-200 fade-in-0 slide-in-from-right-2"
                  value="appearance"
                >
                  <AppearanceFormFields form={form} />
                </TabsContent>

                {/* Voice Tab */}
                <TabsContent
                  className="mt-0 animate-in space-y-6 duration-200 fade-in-0 slide-in-from-right-2"
                  value="voice"
                >
                  <OpenAIRealtimeFormFields form={form} />
                  {hasVapiPlugin ? (
                    <div className="space-y-4 rounded-2xl border p-4">
                      <div>
                        <p className="text-sm font-semibold">Vapi Voice</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Keep using your existing Vapi assistant or phone
                          number alongside OpenAI voice.
                        </p>
                      </div>
                      <VapiFormFields form={form} />
                    </div>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="sticky bottom-0 z-10 sm:bottom-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:rounded-xl sm:border">
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
                      ? "shadow-lg ring-2 shadow-primary/40 ring-primary/30"
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
        </div>

        {/* Live Preview */}
        <div className="hidden xl:absolute xl:top-0 xl:right-0 xl:block xl:w-[360px]">
          <div className="xl:sticky xl:top-6">
            <WidgetLivePreview
              appearance={previewAppearance}
              greetMessage={watchedValues.greetMessage}
              suggestions={previewSuggestions}
              theme={previewTheme}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
