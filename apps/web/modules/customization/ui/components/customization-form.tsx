import { zodResolver } from "@hookform/resolvers/zod"
import { formatDistanceToNow } from "date-fns"
import { useForm } from "react-hook-form"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  MessageSquareTextIcon,
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
import { Doc } from "@workspace/backend/_generated/dataModel"
import { useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { VapiFormFields } from "./vapi-form-fields"
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
>

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

  if (version.action === "bootstrap") {
    return "Initial baseline"
  }

  return "Published draft"
}

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) {
    return "Not available"
  }

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

  const rollbackCandidates = useMemo(
    () => versions.filter((version) => version.version !== publishedVersion),
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
  ].filter((suggestion): suggestion is string => Boolean(suggestion))

  const recentVersions = useMemo(() => versions.slice(0, 6), [versions])
  const isBusy = form.formState.isSubmitting || isPublishing || isRollingBack

  const buildMutationPayload = (values: FormSchema) => {
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

    return {
      greetMessage: values.greetMessage,
      systemPrompt: values.systemPrompt.trim(),
      defaultSuggestions: values.defaultSuggestions,
      vapiSettings,
      theme,
      appearance,
    }
  }

  const onSaveDraft = async (values: FormSchema) => {
    try {
      await saveDraftWidgetSettings(buildMutationPayload(values))
      toast.success("Draft saved")
    } catch (error) {
      console.error(error)
      toast.error("Unable to save draft")
    }
  }

  const onPublishDraft = form.handleSubmit(async (values) => {
    setIsPublishing(true)

    try {
      await saveDraftWidgetSettings(buildMutationPayload(values))
      const result = await publishDraftWidgetSettings({})
      toast.success(`Published version v${result.publishedVersion}`)
    } catch (error) {
      console.error(error)
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
    } catch (error) {
      console.error(error)
      toast.error("Unable to rollback version")
    } finally {
      setIsRollingBack(false)
    }
  }

  const canRollback =
    rollbackCandidates.length > 0 && selectedRollbackVersion !== ""

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSaveDraft)}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/* Release Workflow */}
            <Card className="overflow-hidden border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
                    <ClockIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Release Workflow
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Save drafts, publish when ready, and rollback quickly
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
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
                        <span className="inline-block size-1.5 rounded-full bg-amber-400" />
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
                <div className="grid grid-cols-2 gap-3">
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
                      <SelectTrigger className="w-full bg-background sm:w-64">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {rollbackCandidates.map((version) => (
                          <SelectItem
                            key={version.version}
                            value={version.version.toString()}
                          >
                            v{version.version} —{" "}
                            {describeVersionAction(version)}
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
                    <div className="space-y-0 overflow-hidden rounded-xl border">
                      {recentVersions.map((version, index) => (
                        <div
                          key={version.version}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm ${index !== recentVersions.length - 1 ? "border-b" : ""} ${version.version === publishedVersion ? "bg-primary/5" : "bg-background"}`}
                        >
                          <div
                            className={`size-2 shrink-0 rounded-full ${version.version === publishedVersion ? "bg-green-500" : "bg-muted-foreground/30"}`}
                          />
                          <span
                            className={`font-mono text-xs font-medium ${version.version === publishedVersion ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            v{version.version}
                          </span>
                          <span className="flex-1 truncate text-xs text-muted-foreground">
                            {describeVersionAction(version)}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground/60">
                            {formatRelativeTime(version.publishedAt)}
                          </span>
                          {version.version === publishedVersion && (
                            <Badge
                              className="px-1.5 py-0 text-[10px]"
                              variant="secondary"
                            >
                              live
                            </Badge>
                          )}
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
              <CardContent className="p-5">
                <Tabs className="space-y-5" defaultValue="chat">
                  <TabsList className="h-auto w-full justify-start gap-0.5 rounded-xl bg-muted/50 p-1">
                    <TabsTrigger
                      className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      value="chat"
                    >
                      <MessageSquareTextIcon className="size-3.5" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      value="brand"
                    >
                      <PaletteIcon className="size-3.5" />
                      Brand Kit
                    </TabsTrigger>
                    <TabsTrigger
                      className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      value="appearance"
                    >
                      <SparklesIcon className="size-3.5" />
                      Appearance
                    </TabsTrigger>
                    {hasVapiPlugin && (
                      <TabsTrigger
                        className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        value="voice"
                      >
                        <span className="flex size-3.5 items-center justify-center">
                          🎙
                        </span>
                        Voice
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Chat Tab */}
                  <TabsContent className="mt-0 space-y-6" value="chat">
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
                          <FormDescription className="text-xs">
                            The first message customers see when they open the
                            chat
                          </FormDescription>
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
                          <FormDescription className="text-xs">
                            Controls how the AI assistant behaves by default for customer conversations.
                          </FormDescription>
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
                  <TabsContent className="mt-0" value="brand">
                    <ThemeFormFields form={form} />
                  </TabsContent>

                  {/* Appearance Tab */}
                  <TabsContent className="mt-0" value="appearance">
                    <AppearanceFormFields form={form} />
                  </TabsContent>

                  {/* Voice Tab */}
                  {hasVapiPlugin && (
                    <TabsContent className="mt-0 space-y-6" value="voice">
                      <VapiFormFields form={form} />
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* Action bar */}
            <div className="sticky bottom-4 z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-2 rounded-full transition-colors ${form.formState.isDirty ? "bg-amber-400" : "bg-green-500"}`}
                  />
                  <div>
                    <p className="text-sm leading-none font-medium">
                      {form.formState.isDirty
                        ? "Unsaved changes"
                        : "All changes saved"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isDraftDifferentFromPublished
                        ? "Draft differs from published version"
                        : "Draft matches published version"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="gap-1.5"
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
                    className="gap-1.5"
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
          <div className="xl:sticky xl:top-6 xl:h-fit">
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
