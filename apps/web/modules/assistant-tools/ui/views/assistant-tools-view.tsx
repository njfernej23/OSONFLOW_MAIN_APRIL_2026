"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  Loader2Icon,
  LogOutIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  BUILTIN_TOOL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  createEmptyParameter,
  GOOGLE_SHEETS_OPERATION_LABELS,
  GOOGLE_SHEETS_TEMPLATES,
  INTEGRATION_TOOL_OPTIONS,
  type AssistantTool,
  type IntegrationToolType,
} from "../../constants"

type ToolEditorState = {
  name: string
  description: string
  enabledForChat: boolean
  enabledForVoice: boolean
  isEnabled: boolean
  parameters: AssistantTool["parameters"]
  config: NonNullable<AssistantTool["config"]>
}

const defaultEditorState = (): ToolEditorState => ({
  name: "",
  description: "",
  enabledForChat: true,
  enabledForVoice: false,
  isEnabled: true,
  parameters: [createEmptyParameter()],
  config: {},
})

const toolToEditorState = (tool: AssistantTool): ToolEditorState => ({
  name: tool.name,
  description: tool.description,
  enabledForChat: tool.enabledForChat,
  enabledForVoice: tool.enabledForVoice,
  isEnabled: tool.isEnabled,
  parameters: tool.parameters.length > 0 ? tool.parameters : [createEmptyParameter()],
  config: tool.config ?? {},
})

export const AssistantToolsView = () => {
  const tools = useQuery(api.private.assistantTools.list)
  const googleSheetsStatus = useQuery(api.private.googleSheets.getConnectionStatus)
  const getGoogleOAuthUrl = useAction(api.private.googleSheets.getOAuthAuthorizationUrl)
  const listSpreadsheets = useAction(api.private.googleSheetsActions.listSpreadsheets)
  const listSpreadsheetTabs = useAction(
    api.private.googleSheetsActions.listSpreadsheetTabsForPicker
  )
  const disconnectGoogleSheets = useMutation(api.private.googleSheets.disconnect)
  const upsertGoogleSheetsApiKey = useMutation(api.private.googleSheets.upsertApiKey)
  const bootstrapBuiltinTools = useMutation(
    api.private.assistantTools.bootstrapBuiltinTools
  )
  const createTool = useMutation(api.private.assistantTools.create)
  const updateTool = useMutation(api.private.assistantTools.update)
  const removeTool = useMutation(api.private.assistantTools.remove)

  const [selectedToolId, setSelectedToolId] = useState<Id<"assistantTools"> | "new" | null>(
    null
  )
  const [newToolType, setNewToolType] = useState<IntegrationToolType | null>(null)
  const [editor, setEditor] = useState<ToolEditorState>(defaultEditorState())
  const [googleApiKey, setGoogleApiKey] = useState("")
  const [showApiKeyFallback, setShowApiKeyFallback] = useState(false)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingGoogleKey, setIsSavingGoogleKey] = useState(false)
  const [spreadsheetOptions, setSpreadsheetOptions] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [sheetTabOptions, setSheetTabOptions] = useState<string[]>([])
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false)
  const [isLoadingSheetTabs, setIsLoadingSheetTabs] = useState(false)
  const [useManualSpreadsheetId, setUseManualSpreadsheetId] = useState(false)
  const [spreadsheetLoadError, setSpreadsheetLoadError] = useState<string | null>(null)
  const hasBootstrappedRef = useRef(false)

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return
    }

    hasBootstrappedRef.current = true
    void bootstrapBuiltinTools().catch(() => {
      hasBootstrappedRef.current = false
    })
  }, [bootstrapBuiltinTools])

  useEffect(() => {
    if (googleSheetsStatus && !googleSheetsStatus.oauthAvailable) {
      setShowApiKeyFallback(true)
    }
  }, [googleSheetsStatus])

  const selectedTool = useMemo(() => {
    if (!tools || selectedToolId === "new" || selectedToolId === null) {
      return null
    }

    return tools.find((tool) => tool._id === selectedToolId) ?? null
  }, [selectedToolId, tools])

  const builtinTools = useMemo(
    () => (tools ?? []).filter((tool) => tool.isBuiltin),
    [tools]
  )
  const integrationTools = useMemo(
    () => (tools ?? []).filter((tool) => !tool.isBuiltin),
    [tools]
  )

  const isGoogleSheetsEditor =
    selectedTool?.type === "google_sheets" || newToolType === "google_sheets"

  const loadSpreadsheetOptions = async () => {
    if (!isGoogleSheetsEditor || googleSheetsStatus?.authMethod !== "oauth") {
      setSpreadsheetOptions([])
      setSpreadsheetLoadError(null)
      return
    }

    setIsLoadingSpreadsheets(true)
    setSpreadsheetLoadError(null)

    try {
      const options = await listSpreadsheets({})
      setSpreadsheetOptions(options)

      if (options.length === 0) {
        setSpreadsheetLoadError(
          "No spreadsheets were returned. Enable the Google Drive API in Google Cloud Console, then disconnect and reconnect this account."
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load spreadsheets"
      setSpreadsheetOptions([])
      setSpreadsheetLoadError(message)
      toast.error(message)
    } finally {
      setIsLoadingSpreadsheets(false)
    }
  }

  useEffect(() => {
    void loadSpreadsheetOptions()
  }, [googleSheetsStatus?.authMethod, isGoogleSheetsEditor])

  useEffect(() => {
    const spreadsheetId = editor.config.spreadsheetId?.trim()

    if (
      !isGoogleSheetsEditor ||
      googleSheetsStatus?.authMethod !== "oauth" ||
      !spreadsheetId
    ) {
      setSheetTabOptions([])
      return
    }

    let cancelled = false
    setIsLoadingSheetTabs(true)

    void listSpreadsheetTabs({ spreadsheetId })
      .then((tabs) => {
        if (!cancelled) {
          setSheetTabOptions(tabs)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSheetTabOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSheetTabs(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    editor.config.spreadsheetId,
    googleSheetsStatus?.authMethod,
    isGoogleSheetsEditor,
    listSpreadsheetTabs,
  ])

  useEffect(() => {
    if (sheetTabOptions.length === 0) {
      return
    }

    setEditor((current) => {
      if (current.config.range?.trim()) {
        return current
      }

      return {
        ...current,
        config: {
          ...current.config,
          range: sheetTabOptions[0],
        },
      }
    })
  }, [sheetTabOptions])

  const selectTool = (tool: AssistantTool) => {
    setSelectedToolId(tool._id)
    setNewToolType(null)
    setEditor(toolToEditorState(tool))
  }

  const startNewGoogleSheetsTool = (
    template: (typeof GOOGLE_SHEETS_TEMPLATES)[number]
  ) => {
    setSelectedToolId("new")
    setNewToolType("google_sheets")
    setEditor({
      name: template.name,
      description: template.toolDescription,
      enabledForChat: true,
      enabledForVoice: template.operation === "lookup",
      isEnabled: true,
      parameters: template.parameters,
      config: {
        spreadsheetId: "",
        ...template.config,
      },
    })
  }

  const startNewIntegration = (type: IntegrationToolType) => {
    setSelectedToolId("new")
    setNewToolType(type)
    setEditor({
      ...defaultEditorState(),
      parameters: [createEmptyParameter()],
      config:
        type === "api_request"
          ? {
              url: "",
              method: "POST",
              headersJson: "{}",
              bodyTemplate: JSON.stringify(
                { name: "{{name}}", phone_last4: "{{phone_last4}}" },
                null,
                2
              ),
            }
          : {
              webhookUrl: "",
              webhookMethod: "POST",
            },
    })
  }

  const handleSave = async () => {
    if (!editor.name.trim() || !editor.description.trim()) {
      toast.error("Tool name and description are required")
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name: editor.name,
        description: editor.description,
        enabledForChat: editor.enabledForChat,
        enabledForVoice: editor.enabledForVoice,
        isEnabled: editor.isEnabled,
        parameters: editor.parameters.filter((parameter) => parameter.name.trim()),
        config: editor.config,
      }

      if (selectedToolId === "new" && newToolType) {
        const toolId = await createTool({
          type: newToolType,
          ...payload,
        })
        setSelectedToolId(toolId)
        toast.success("Tool created")
      } else if (selectedTool) {
        await updateTool({
          toolId: selectedTool._id,
          ...payload,
        })
        toast.success("Tool updated")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save assistant tool"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTool || selectedTool.isBuiltin) return

    try {
      await removeTool({ toolId: selectedTool._id })
      setSelectedToolId(null)
      setEditor(defaultEditorState())
      toast.success("Tool deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete assistant tool"
      )
    }
  }

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true)

    try {
      const { authorizationUrl } = await getGoogleOAuthUrl()
      window.location.assign(authorizationUrl)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Google sign-in"
      )
      setIsConnectingGoogle(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    setIsDisconnectingGoogle(true)

    try {
      await disconnectGoogleSheets()
      setSpreadsheetOptions([])
      setSheetTabOptions([])
      setSpreadsheetLoadError(null)
      toast.success("Google account disconnected")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to disconnect Google account"
      )
    } finally {
      setIsDisconnectingGoogle(false)
    }
  }

  const handleSaveGoogleKey = async () => {
    if (!googleApiKey.trim()) {
      toast.error("Google Sheets API key is required")
      return
    }

    setIsSavingGoogleKey(true)

    try {
      await upsertGoogleSheetsApiKey({ apiKey: googleApiKey.trim() })
      setGoogleApiKey("")
      toast.success("Google Sheets API key saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save Google Sheets key"
      )
    } finally {
      setIsSavingGoogleKey(false)
    }
  }

  const updateParameter = (
    index: number,
    field: keyof AssistantTool["parameters"][number],
    value: string | boolean
  ) => {
    setEditor((current) => ({
      ...current,
      parameters: current.parameters.map((parameter, parameterIndex) =>
        parameterIndex === index ? { ...parameter, [field]: value } : parameter
      ),
    }))
  }

  const renderToolButton = (tool: AssistantTool, icon: string, iconClassName: string) => (
    <button
      key={tool._id}
      type="button"
      onClick={() => selectTool(tool)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selectedToolId === tool._id
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-background/40 hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{tool.name}</p>
          {!tool.isEnabled && (
            <Badge className="shrink-0 text-[10px]" variant="outline">
              Off
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{tool.description}</p>
      </div>
    </button>
  )

  const editorTitle =
    selectedTool?.isBuiltin
      ? BUILTIN_TOOL_OPTIONS.find((entry) => entry.type === selectedTool.type)?.title ??
        "Tool"
      : selectedTool?.type === "google_sheets"
        ? GOOGLE_SHEETS_OPERATION_LABELS[
            selectedTool.config?.operation ?? "lookup"
          ]
        : newToolType === "google_sheets"
          ? GOOGLE_SHEETS_OPERATION_LABELS[editor.config.operation ?? "lookup"]
          : newToolType
            ? INTEGRATION_TOOL_OPTIONS.find((entry) => entry.type === newToolType)
                ?.title
            : selectedTool
              ? "Integration Tool"
              : "Tool"

  const showEditor = selectedTool !== null || selectedToolId === "new"

  if (tools === undefined) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading assistant tools...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
              <WrenchIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Configuration
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Assistant Tools</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Configure tool calling for chat and voice assistants.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {tools.filter((tool) => tool.isEnabled).length} active
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {tools.length} total
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6 lg:flex-row">
        <aside className="surface-panel flex max-h-[min(380px,42vh)] w-full shrink-0 flex-col overflow-hidden rounded-[22px] lg:max-h-none lg:h-full lg:w-[300px] lg:max-w-[300px]">
          <div className="shrink-0 border-b border-border/60 px-4 py-3">
            <p className="text-sm font-medium">Tool library</p>
            <p className="text-xs text-muted-foreground">
              Built-ins and integrations available to your assistant.
            </p>
          </div>
          <ScrollArea className="min-h-0 flex-1 lg:max-h-none">
            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Assistant Tools
                </p>
                <div className="space-y-2">
                  {builtinTools.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                      Default tools are being prepared...
                    </p>
                  ) : (
                    builtinTools.map((tool) => {
                      const option = BUILTIN_TOOL_OPTIONS.find(
                        (entry) => entry.type === tool.type
                      )
                      return renderToolButton(
                        tool,
                        option?.icon ?? "•",
                        option?.iconClassName ?? "bg-muted text-foreground"
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Integrations
                </p>
                <div className="space-y-2">
                  {integrationTools.map((tool) => {
                    if (tool.type === "google_sheets") {
                      const operation = tool.config?.operation ?? "lookup"
                      const template = GOOGLE_SHEETS_TEMPLATES.find(
                        (entry) => entry.operation === operation
                      )

                      return renderToolButton(
                        tool,
                        template?.icon ?? "⌕",
                        "bg-emerald-500/15 text-emerald-400"
                      )
                    }

                    const option = INTEGRATION_TOOL_OPTIONS.find(
                      (entry) => entry.type === tool.type
                    )
                    return renderToolButton(
                      tool,
                      option?.icon ?? "•",
                      option?.iconClassName ?? "bg-muted text-foreground"
                    )
                  })}
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Google Sheets
                  </p>
                  {GOOGLE_SHEETS_TEMPLATES.map((template) => (
                    <button
                      key={template.operation}
                      type="button"
                      onClick={() => startNewGoogleSheetsTool(template)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        selectedToolId === "new" &&
                          newToolType === "google_sheets" &&
                          editor.config.operation === template.operation
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/70"
                      )}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-semibold text-emerald-400">
                        {template.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{template.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Add new</p>
                  {INTEGRATION_TOOL_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => startNewIntegration(option.type)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        selectedToolId === "new" && newToolType === option.type
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/70"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                          option.iconClassName
                        )}
                      >
                        {option.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{option.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                      <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        <section className="surface-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px]">
          {!showEditor ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
                <SearchIcon className="size-7 text-muted-foreground/60" />
              </div>
              <div>
                <p className="font-medium">Select a tool to configure</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Choose a built-in assistant tool or add an integration like Google
                  Sheets.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{editorTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      Tool settings used by the assistant when deciding what to call.
                    </p>
                  </div>
                  {selectedTool && !selectedTool.isBuiltin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 p-5 sm:p-6">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-2">
                      <Label htmlFor="tool-name">Tool Name</Label>
                      <Input
                        id="tool-name"
                        value={editor.name}
                        disabled={selectedTool?.isBuiltin}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="lookup_account"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must start with a letter and contain only letters, numbers, and
                        underscores.
                      </p>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Enabled</p>
                          <p className="text-xs text-muted-foreground">
                            Allow the assistant to use this tool
                          </p>
                        </div>
                        <Switch
                          checked={editor.isEnabled}
                          onCheckedChange={(checked) =>
                            setEditor((current) => ({ ...current, isEnabled: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Chat</p>
                          <p className="text-xs text-muted-foreground">Widget and channels</p>
                        </div>
                        <Switch
                          checked={editor.enabledForChat}
                          onCheckedChange={(checked) =>
                            setEditor((current) => ({
                              ...current,
                              enabledForChat: checked,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Voice</p>
                          <p className="text-xs text-muted-foreground">
                            OpenAI Realtime and Gemini Live
                          </p>
                        </div>
                        <Switch
                          checked={editor.enabledForVoice}
                          onCheckedChange={(checked) =>
                            setEditor((current) => ({
                              ...current,
                              enabledForVoice: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                <Label htmlFor="tool-description">Description</Label>
                <Textarea
                  id="tool-description"
                  value={editor.description}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Look up account based on provided name and last 4 digits of the phone number."
                />
                <p className="text-xs text-muted-foreground">
                  {editor.description.length}/1000
                </p>
              </div>

              {selectedTool?.type === "query" && (
                <div className="space-y-2">
                  <Label>Knowledge Base Model</Label>
                  <Select
                    value={editor.config.knowledgeBaseModel ?? "gpt-4o-mini"}
                    onValueChange={(value) =>
                      setEditor((current) => ({
                        ...current,
                        config: { ...current.config, knowledgeBaseModel: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAT_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The model used to interpret knowledge base search results.
                  </p>
                </div>
              )}

              {(selectedTool?.type === "google_sheets" ||
                newToolType === "google_sheets") && (
                <div className="space-y-4 rounded-2xl border border-border/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {GOOGLE_SHEETS_OPERATION_LABELS[
                        editor.config.operation ?? "lookup"
                      ]}
                    </Badge>
                    {(editor.config.operation ?? "lookup") !== "lookup" ? (
                      <p className="text-xs text-muted-foreground">
                        Requires Google account (OAuth). API keys only support lookups.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Google account</p>
                      <p className="text-xs text-muted-foreground">
                        Connect the Google account that owns or can access your spreadsheet.
                        After connecting, your spreadsheets and tabs load automatically.
                      </p>
                    </div>
                    <Badge
                      variant={googleSheetsStatus?.isConfigured ? "default" : "outline"}
                    >
                      {googleSheetsStatus?.authMethod === "oauth" && googleSheetsStatus.email
                        ? googleSheetsStatus.email
                        : googleSheetsStatus?.isConfigured
                          ? "Connected"
                          : "Not connected"}
                    </Badge>
                  </div>

                  {!googleSheetsStatus?.oauthAvailable ? (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      Google sign-in is not configured on the server yet. Ask your admin to
                      set the Google OAuth environment variables in Convex, or use an API key
                      below.
                    </p>
                  ) : googleSheetsStatus?.authMethod !== "oauth" ? (
                    <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                      Connect Google to browse your spreadsheets and sheet tabs here.
                    </p>
                  ) : (
                    <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                      If spreadsheets do not appear, remove Osonflow from your{" "}
                      <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Google account permissions
                      </a>
                      , then disconnect and reconnect here so Drive access is granted.
                      Also enable the Google Drive API in Google Cloud Console for your OAuth
                      project.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {googleSheetsStatus?.authMethod === "oauth" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isDisconnectingGoogle}
                        onClick={handleDisconnectGoogle}
                        className="gap-2"
                      >
                        {isDisconnectingGoogle ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <LogOutIcon className="size-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={isConnectingGoogle || !googleSheetsStatus?.oauthAvailable}
                        onClick={handleConnectGoogle}
                        className="gap-2"
                      >
                        {isConnectingGoogle ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : null}
                        Connect Google account
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKeyFallback((current) => !current)}
                    >
                      {showApiKeyFallback ? "Hide API key option" : "Use API key instead"}
                    </Button>
                  </div>

                  {showApiKeyFallback ? (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Advanced: API key works only for public sheets or sheets shared with
                        your Google Cloud project.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="password"
                          value={googleApiKey}
                          onChange={(event) => setGoogleApiKey(event.target.value)}
                          placeholder="AIza..."
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSavingGoogleKey}
                          onClick={handleSaveGoogleKey}
                        >
                          {isSavingGoogleKey ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            "Save key"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-2">
                      <Label>Spreadsheet</Label>
                      {googleSheetsStatus?.authMethod === "oauth" &&
                      !useManualSpreadsheetId ? (
                        <>
                          <Select
                            value={editor.config.spreadsheetId || undefined}
                            onValueChange={(value) =>
                              setEditor((current) => ({
                                ...current,
                                config: {
                                  ...current.config,
                                  spreadsheetId: value,
                                },
                              }))
                            }
                            disabled={isLoadingSpreadsheets}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  isLoadingSpreadsheets
                                    ? "Loading your spreadsheets..."
                                    : "Choose a spreadsheet"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {spreadsheetOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {spreadsheetLoadError ? (
                            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                              {spreadsheetLoadError}
                            </p>
                          ) : spreadsheetOptions.length === 0 && !isLoadingSpreadsheets ? (
                            <p className="text-xs text-muted-foreground">
                              No spreadsheets found in this Google account.
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto px-0"
                              onClick={() => setUseManualSpreadsheetId(true)}
                            >
                              Enter spreadsheet ID manually
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto px-0"
                              disabled={isLoadingSpreadsheets}
                              onClick={() => void loadSpreadsheetOptions()}
                            >
                              {isLoadingSpreadsheets ? "Refreshing..." : "Refresh list"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Input
                            value={editor.config.spreadsheetId ?? ""}
                            onChange={(event) =>
                              setEditor((current) => ({
                                ...current,
                                config: {
                                  ...current.config,
                                  spreadsheetId: event.target.value,
                                },
                              }))
                            }
                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          />
                          {googleSheetsStatus?.authMethod === "oauth" ? (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto px-0"
                              onClick={() => setUseManualSpreadsheetId(false)}
                            >
                              Choose from my Google Drive
                            </Button>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Connect Google account to browse your spreadsheets.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Sheet tab</Label>
                      {sheetTabOptions.length > 0 ? (
                        <Select
                          value={editor.config.range || undefined}
                          onValueChange={(value) =>
                            setEditor((current) => ({
                              ...current,
                              config: { ...current.config, range: value },
                            }))
                          }
                          disabled={isLoadingSheetTabs}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingSheetTabs ? "Loading tabs..." : "Choose a tab"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sheetTabOptions.map((tab) => (
                              <SelectItem key={tab} value={tab}>
                                {tab}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={editor.config.range ?? ""}
                          onChange={(event) =>
                            setEditor((current) => ({
                              ...current,
                              config: { ...current.config, range: event.target.value },
                            }))
                          }
                          placeholder="Sheet1"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        The tab name inside the spreadsheet (must include a header row).
                      </p>
                    </div>
                  </div>
                  {(editor.config.operation ?? "lookup") === "lookup" ||
                  (editor.config.operation ?? "lookup") === "update" ||
                  (editor.config.operation ?? "lookup") === "delete" ? (
                    <div className="space-y-2">
                      <Label>Search columns</Label>
                      <Input
                        value={(editor.config.searchColumns ?? []).join(", ")}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            config: {
                              ...current.config,
                              searchColumns: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                        placeholder="name, phone"
                      />
                      <p className="text-xs text-muted-foreground">
                        Columns used to find the row. Parameter names should match these
                        headers.
                      </p>
                    </div>
                  ) : null}
                  {(editor.config.operation ?? "lookup") === "append" ? (
                    <div className="space-y-2">
                      <Label>Value columns</Label>
                      <Input
                        value={(editor.config.valueColumns ?? []).join(", ")}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            config: {
                              ...current.config,
                              valueColumns: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                        placeholder="name, phone, email"
                      />
                      <p className="text-xs text-muted-foreground">
                        Sheet headers to fill when adding a row. Parameter names should match
                        these columns.
                      </p>
                    </div>
                  ) : null}
                  {(editor.config.operation ?? "lookup") === "update" ? (
                    <div className="space-y-2">
                      <Label>Update columns</Label>
                      <Input
                        value={(editor.config.updateColumns ?? []).join(", ")}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            config: {
                              ...current.config,
                              updateColumns: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                        placeholder="phone, email, status"
                      />
                      <p className="text-xs text-muted-foreground">
                        Columns the assistant can change after finding a row.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {(selectedTool?.type === "api_request" ||
                newToolType === "api_request") && (
                <div className="space-y-4 rounded-2xl border border-border/60 p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input
                        value={editor.config.url ?? ""}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            config: { ...current.config, url: event.target.value },
                          }))
                        }
                        placeholder="https://api.example.com/lookup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select
                        value={editor.config.method ?? "POST"}
                        onValueChange={(value: "GET" | "POST") =>
                          setEditor((current) => ({
                            ...current,
                            config: { ...current.config, method: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Headers JSON</Label>
                    <Textarea
                      value={editor.config.headersJson ?? "{}"}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            headersJson: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body template</Label>
                    <Textarea
                      value={editor.config.bodyTemplate ?? ""}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            bodyTemplate: event.target.value,
                          },
                        }))
                      }
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{{parameter_name}}"} placeholders for tool arguments.
                    </p>
                  </div>
                </div>
              )}

              {(selectedTool?.type === "custom_webhook" ||
                newToolType === "custom_webhook") && (
                <div className="space-y-4 rounded-2xl border border-border/60 p-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={editor.config.webhookUrl ?? ""}
                      onChange={(event) =>
                        setEditor((current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            webhookUrl: event.target.value,
                          },
                        }))
                      }
                      placeholder="https://hooks.example.com/assistant-tool"
                    />
                  </div>
                </div>
              )}

              {!selectedTool?.isBuiltin && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Parameters</p>
                      <p className="text-xs text-muted-foreground">
                        Define the inputs the assistant can send to this tool.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditor((current) => ({
                          ...current,
                          parameters: [...current.parameters, createEmptyParameter()],
                        }))
                      }
                    >
                      <PlusIcon className="size-4" />
                      Add parameter
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {editor.parameters.map((parameter, index) => (
                      <div
                        key={`${parameter.name}-${index}`}
                        className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input
                              value={parameter.name}
                              onChange={(event) =>
                                updateParameter(index, "name", event.target.value)
                              }
                              placeholder="name"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Description
                            </Label>
                            <Input
                              value={parameter.description}
                              onChange={(event) =>
                                updateParameter(index, "description", event.target.value)
                              }
                              placeholder="What this input represents"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-[140px] flex-1 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Select
                              value={parameter.type}
                              onValueChange={(value: "string" | "number" | "boolean") =>
                                updateParameter(index, "type", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
                            <Switch
                              checked={parameter.required}
                              onCheckedChange={(checked) =>
                                updateParameter(index, "required", checked)
                              }
                            />
                            <span className="text-xs text-muted-foreground">Required</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-auto shrink-0"
                            onClick={() =>
                              setEditor((current) => ({
                                ...current,
                                parameters: current.parameters.filter(
                                  (_, parameterIndex) => parameterIndex !== index
                                ),
                              }))
                            }
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                </div>
              </ScrollArea>

              <div className="shrink-0 border-t border-border/60 bg-background/80 px-5 py-4 backdrop-blur-sm sm:px-6">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <p className="text-center text-xs text-muted-foreground sm:mr-auto sm:text-left">
                    Changes apply to chat and voice when the corresponding channel toggle is on.
                  </p>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SaveIcon className="size-4" />
                    )}
                    Save tool
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
