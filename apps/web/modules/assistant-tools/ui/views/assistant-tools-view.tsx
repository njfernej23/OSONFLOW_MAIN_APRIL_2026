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
  ConsoleHeader,
  ConsoleMeta,
  ConsoleSearch,
  EmptyState as ConsoleEmptyState,
} from "@/modules/dashboard/ui/components/console"
import {
  Loader2Icon,
  LogOutIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  BUILTIN_TOOL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  createEmptyParameter,
  GOOGLE_SHEETS_MATCH_MODE_OPTIONS,
  GOOGLE_SHEETS_OPERATION_LABELS,
  GOOGLE_SHEETS_QUERY_STRATEGY_OPTIONS,
  GOOGLE_SHEETS_TEMPLATES,
  INTEGRATION_TOOL_OPTIONS,
  type AssistantTool,
  type IntegrationToolType,
} from "../../constants"
import { buildGoogleSheetsParameters } from "../../lib/google-sheets-parameters"
import { SheetColumnPicker } from "../components/sheet-column-picker"

type ToolEditorState = {
  name: string
  description: string
  enabledForChat: boolean
  enabledForVoice: boolean
  isEnabled: boolean
  parameters: AssistantTool["parameters"]
  config: NonNullable<AssistantTool["config"]>
}

const VOICE_UNSUPPORTED_TOOL_TYPES = new Set<AssistantTool["type"]>([
  "handoff",
  "resolve",
])

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
  parameters:
    tool.parameters.length > 0 ? tool.parameters : [createEmptyParameter()],
  config: tool.config ?? {},
})

export const AssistantToolsView = () => {
  const tools = useQuery(api.private.assistantTools.list)
  const googleSheetsStatus = useQuery(
    api.private.googleSheets.getConnectionStatus
  )
  const getGoogleOAuthUrl = useAction(
    api.private.googleSheets.getOAuthAuthorizationUrl
  )
  const listSpreadsheets = useAction(
    api.private.googleSheetsActions.listSpreadsheets
  )
  const listSpreadsheetTabs = useAction(
    api.private.googleSheetsActions.listSpreadsheetTabsForPicker
  )
  const listSpreadsheetColumnHeaders = useAction(
    api.private.googleSheetsActions.listSpreadsheetColumnHeadersForPicker
  )
  const disconnectGoogleSheets = useMutation(
    api.private.googleSheets.disconnect
  )
  const upsertGoogleSheetsApiKey = useMutation(
    api.private.googleSheets.upsertApiKey
  )
  const bootstrapBuiltinTools = useMutation(
    api.private.assistantTools.bootstrapBuiltinTools
  )
  const createTool = useMutation(api.private.assistantTools.create)
  const updateTool = useMutation(api.private.assistantTools.update)
  const removeTool = useMutation(api.private.assistantTools.remove)
  const testExecute = useAction(api.private.assistantTools.testExecute)

  const [selectedToolId, setSelectedToolId] = useState<
    Id<"assistantTools"> | "new" | null
  >(null)
  const [newToolType, setNewToolType] = useState<IntegrationToolType | null>(
    null
  )
  const [editor, setEditor] = useState<ToolEditorState>(defaultEditorState())
  const [libraryQuery, setLibraryQuery] = useState("")
  const [spreadsheetFilter, setSpreadsheetFilter] = useState("")
  const [showAdvancedSheets, setShowAdvancedSheets] = useState(false)
  const [testArgsJson, setTestArgsJson] = useState("{}")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
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
  const [sheetColumnOptions, setSheetColumnOptions] = useState<string[]>([])
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false)
  const [isLoadingSheetTabs, setIsLoadingSheetTabs] = useState(false)
  const [isLoadingSheetColumns, setIsLoadingSheetColumns] = useState(false)
  const [useManualSpreadsheetId, setUseManualSpreadsheetId] = useState(false)
  const [spreadsheetLoadError, setSpreadsheetLoadError] = useState<
    string | null
  >(null)
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

  const filteredBuiltinTools = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase()
    if (!query) return builtinTools
    return builtinTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.type.toLowerCase().includes(query)
    )
  }, [builtinTools, libraryQuery])

  const filteredIntegrationTools = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase()
    if (!query) return integrationTools
    return integrationTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.type.toLowerCase().includes(query)
    )
  }, [integrationTools, libraryQuery])

  const filteredSpreadsheetOptions = useMemo(() => {
    const query = spreadsheetFilter.trim().toLowerCase()
    if (!query) return spreadsheetOptions
    return spreadsheetOptions.filter(
      (option) =>
        option.name.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query)
    )
  }, [spreadsheetFilter, spreadsheetOptions])

  const isGoogleSheetsEditor =
    selectedTool?.type === "google_sheets" || newToolType === "google_sheets"
  const selectedToolType = selectedTool?.type ?? newToolType
  const isVoiceUnsupportedTool = selectedToolType
    ? VOICE_UNSUPPORTED_TOOL_TYPES.has(selectedToolType)
    : false

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
      !googleSheetsStatus?.isConfigured ||
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
    googleSheetsStatus?.isConfigured,
    isGoogleSheetsEditor,
    listSpreadsheetTabs,
  ])

  useEffect(() => {
    const spreadsheetId = editor.config.spreadsheetId?.trim()
    const sheetName = editor.config.range?.trim()

    if (
      !isGoogleSheetsEditor ||
      !googleSheetsStatus?.isConfigured ||
      !spreadsheetId ||
      !sheetName
    ) {
      setSheetColumnOptions([])
      return
    }

    let cancelled = false
    setIsLoadingSheetColumns(true)

    void listSpreadsheetColumnHeaders({ spreadsheetId, sheetName })
      .then((headers) => {
        if (!cancelled) {
          setSheetColumnOptions(headers)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSheetColumnOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSheetColumns(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    editor.config.range,
    editor.config.spreadsheetId,
    googleSheetsStatus?.isConfigured,
    isGoogleSheetsEditor,
    listSpreadsheetColumnHeaders,
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

  useEffect(() => {
    if (!isGoogleSheetsEditor || sheetColumnOptions.length === 0) {
      return
    }

    const matchColumns = (requested: string[] = [], fallbackCount = 1) => {
      const matched = requested.filter((column) =>
        sheetColumnOptions.includes(column)
      )
      return matched.length > 0
        ? matched
        : sheetColumnOptions.slice(
            0,
            Math.min(fallbackCount, sheetColumnOptions.length)
          )
    }

    setEditor((current) => {
      const operation = current.config.operation ?? "lookup"
      const searchColumns = matchColumns(current.config.searchColumns, 2)
      const valueColumns = matchColumns(
        current.config.valueColumns ?? [],
        sheetColumnOptions.length
      )
      const updateColumns = matchColumns(
        current.config.updateColumns ?? [],
        Math.max(sheetColumnOptions.length - 1, 1)
      )

      const columnsUnchanged =
        JSON.stringify(searchColumns) ===
          JSON.stringify(current.config.searchColumns) &&
        JSON.stringify(valueColumns) ===
          JSON.stringify(current.config.valueColumns) &&
        JSON.stringify(updateColumns) ===
          JSON.stringify(current.config.updateColumns)

      if (columnsUnchanged) {
        return current
      }

      const nextConfig = {
        ...current.config,
        searchColumns,
        valueColumns,
        updateColumns,
      }

      return {
        ...current,
        config: nextConfig,
        parameters: buildGoogleSheetsParameters({
          operation,
          searchColumns: nextConfig.searchColumns,
          valueColumns: nextConfig.valueColumns,
          updateColumns: nextConfig.updateColumns,
        }),
      }
    })
  }, [isGoogleSheetsEditor, sheetColumnOptions])

  const selectTool = (tool: AssistantTool) => {
    if (
      isDirty &&
      !window.confirm("You have unsaved changes. Discard them?")
    ) {
      return
    }
    setSelectedToolId(tool._id)
    setNewToolType(null)
    const next = toolToEditorState(tool)
    setEditor(next)
    setIsDirty(false)
    setTestResult(null)
    setTestArgsJson("{}")
  }

  const startNewGoogleSheetsTool = (
    template: (typeof GOOGLE_SHEETS_TEMPLATES)[number]
  ) => {
    if (
      isDirty &&
      !window.confirm("You have unsaved changes. Discard them?")
    ) {
      return
    }
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
    setIsDirty(true)
    setShowAdvancedSheets(true)
    setTestResult(null)
  }

  const startNewIntegration = (type: IntegrationToolType) => {
    if (
      isDirty &&
      !window.confirm("You have unsaved changes. Discard them?")
    ) {
      return
    }
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
    setIsDirty(true)
    setTestResult(null)
  }

  const handleSheetColumnsChange = (
    field: "searchColumns" | "valueColumns" | "updateColumns",
    columns: string[]
  ) => {
    setIsDirty(true)
    setEditor((current) => {
      const nextConfig = {
        ...current.config,
        [field]: columns,
      }
      const operation = nextConfig.operation ?? "lookup"

      return {
        ...current,
        config: nextConfig,
        parameters: buildGoogleSheetsParameters({
          operation,
          searchColumns: nextConfig.searchColumns ?? [],
          valueColumns: nextConfig.valueColumns ?? [],
          updateColumns: nextConfig.updateColumns ?? [],
        }),
      }
    })
  }

  const handleSave = async () => {
    if (!editor.name.trim() || !editor.description.trim()) {
      toast.error("Tool name and description are required")
      return
    }

    if (isGoogleSheetsEditor) {
      if (!editor.config.spreadsheetId?.trim()) {
        toast.error("Choose a spreadsheet before saving")
        return
      }

      if (!editor.config.range?.trim()) {
        toast.error("Choose a sheet tab before saving")
        return
      }

      const operation = editor.config.operation ?? "lookup"

      if (
        (operation === "lookup" ||
          operation === "update" ||
          operation === "delete") &&
        (editor.config.searchColumns ?? []).length === 0
      ) {
        toast.error("Select at least one search column")
        return
      }

      if (
        operation === "append" &&
        (editor.config.valueColumns ?? []).length === 0
      ) {
        toast.error("Select at least one value column")
        return
      }

      if (
        operation === "update" &&
        (editor.config.updateColumns ?? []).length === 0
      ) {
        toast.error("Select at least one update column")
        return
      }
    }

    setIsSaving(true)

    try {
      const operation = editor.config.operation ?? "lookup"
      const parameters = isGoogleSheetsEditor
        ? buildGoogleSheetsParameters({
            operation,
            searchColumns: editor.config.searchColumns ?? [],
            valueColumns: editor.config.valueColumns ?? [],
            updateColumns: editor.config.updateColumns ?? [],
          })
        : editor.parameters.filter((parameter) => parameter.name.trim())

      const payload = {
        name: editor.name,
        description: editor.description,
        enabledForChat: editor.enabledForChat,
        enabledForVoice: isVoiceUnsupportedTool
          ? false
          : editor.enabledForVoice,
        isEnabled: editor.isEnabled,
        parameters,
        config: editor.config,
      }

      if (selectedToolId === "new" && newToolType) {
        const toolId = await createTool({
          type: newToolType,
          ...payload,
        })
        setSelectedToolId(toolId)
        toast.success("Tool created")
        setIsDirty(false)
      } else if (selectedTool) {
        await updateTool({
          toolId: selectedTool._id,
          ...payload,
        })
        toast.success("Tool updated")
        setIsDirty(false)
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
      setIsDirty(false)
      toast.success("Tool deleted")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete assistant tool"
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
        error instanceof Error
          ? error.message
          : "Unable to start Google sign-in"
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
        error instanceof Error
          ? error.message
          : "Unable to disconnect Google account"
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
        error instanceof Error
          ? error.message
          : "Unable to save Google Sheets key"
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

  const renderToolButton = (
    tool: AssistantTool,
    icon: string,
    iconClassName: string
  ) => (
    <button
      key={tool._id}
      type="button"
      onClick={() => selectTool(tool)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selectedToolId === tool._id
          ? "border-primary/40 bg-primary/10"
          : "border-[var(--console-hairline-soft)] bg-transparent hover:bg-muted/40"
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
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {tool.description}
        </p>
      </div>
    </button>
  )

  const editorTitle = selectedTool?.isBuiltin
    ? (BUILTIN_TOOL_OPTIONS.find((entry) => entry.type === selectedTool.type)
        ?.title ?? "Tool")
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
      <div className="console-page flex h-full min-h-0 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="console-medallion size-12">
            <Loader2Icon className="size-5 animate-spin" />
          </span>
          <p className="text-sm text-muted-foreground">
            Loading assistant tools…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="console-page flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-5 sm:px-6">
        <div className="mx-auto max-w-[1440px]">
          <ConsoleHeader
            icon={WrenchIcon}
            eyebrow="Configuration"
            title="Assistant tools"
            description="What your chat and voice assistants are allowed to call, and how each call is shaped."
            meta={
              <>
                <ConsoleMeta
                  dot
                  label="Active"
                  tone="positive"
                  value={tools.filter((tool) => tool.isEnabled).length}
                />
                <ConsoleMeta label="Available" value={tools.length} />
              </>
            }
          />
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-4 overflow-hidden p-4 sm:px-6 sm:pb-6 lg:flex-row">
        <aside className="console-card flex max-h-[min(380px,42vh)] w-full shrink-0 flex-col overflow-hidden lg:h-full lg:max-h-none lg:w-[300px] lg:max-w-[300px]">
          <div className="shrink-0 space-y-3 border-b border-[var(--console-hairline-soft)] px-4 py-3.5">
            <div>
              <h2 className="console-section-title">Tool library</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Built-ins and integrations available to your assistant.
              </p>
            </div>
            <ConsoleSearch
              onChange={setLibraryQuery}
              placeholder="Search tools…"
              value={libraryQuery}
            />
          </div>
          <ScrollArea className="min-h-0 flex-1 lg:max-h-none">
            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Assistant Tools
                </p>
                <div className="space-y-2">
                  {filteredBuiltinTools.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--console-hairline-soft)] px-3 py-4 text-center text-xs text-muted-foreground">
                      {builtinTools.length === 0
                        ? "Default tools are being prepared..."
                        : "No built-in tools match your search."}
                    </p>
                  ) : (
                    filteredBuiltinTools.map((tool) => {
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
                <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Integrations
                </p>
                <div className="space-y-2">
                  {filteredIntegrationTools.map((tool) => {
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
                  {filteredIntegrationTools.length === 0 &&
                  libraryQuery.trim() ? (
                    <p className="rounded-xl border border-dashed border-[var(--console-hairline-soft)] px-3 py-4 text-center text-xs text-muted-foreground">
                      No integrations match your search.
                    </p>
                  ) : null}
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
                          : "border-[var(--console-hairline-soft)]"
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
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Add new
                  </p>
                  {INTEGRATION_TOOL_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => startNewIntegration(option.type)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        selectedToolId === "new" && newToolType === option.type
                          ? "border-primary/40 bg-primary/5"
                          : "border-[var(--console-hairline-soft)]"
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

        <section className="console-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!showEditor ? (
            <ConsoleEmptyState
              className="flex-1"
              description="Choose a built-in assistant tool or add an integration like Google Sheets."
              icon={WrenchIcon}
              title="Select a tool to configure"
            />
          ) : (
            <>
              <div className="shrink-0 border-b border-[var(--console-hairline-soft)] px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="console-section-title text-[0.95rem]">
                      {editorTitle}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Tool settings used by the assistant when deciding what to
                      call.
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
                        Must start with a letter and contain only letters,
                        numbers, and underscores.
                      </p>
                    </div>
                    <div className="space-y-3 console-inset p-4">
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
                            setEditor((current) => ({
                              ...current,
                              isEnabled: checked,
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Chat</p>
                          <p className="text-xs text-muted-foreground">
                            Widget and channels
                          </p>
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
                            {isVoiceUnsupportedTool
                              ? "Voice cannot hand off or resolve conversations"
                              : "OpenAI Realtime and Gemini Live"}
                          </p>
                        </div>
                        <Switch
                          checked={
                            isVoiceUnsupportedTool
                              ? false
                              : editor.enabledForVoice
                          }
                          disabled={isVoiceUnsupportedTool}
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
                        value={
                          editor.config.knowledgeBaseModel ?? "gpt-4o-mini"
                        }
                        onValueChange={(value) =>
                          setEditor((current) => ({
                            ...current,
                            config: {
                              ...current.config,
                              knowledgeBaseModel: value,
                            },
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
                        The model used to interpret knowledge base search
                        results.
                      </p>
                    </div>
                  )}

                  {(selectedTool?.type === "google_sheets" ||
                    newToolType === "google_sheets") && (
                    <div className="space-y-4 console-inset p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {
                            GOOGLE_SHEETS_OPERATION_LABELS[
                              editor.config.operation ?? "lookup"
                            ]
                          }
                        </Badge>
                        {(editor.config.operation ?? "lookup") !== "lookup" ? (
                          <p className="text-xs text-muted-foreground">
                            Requires Google account (OAuth). API keys only
                            support lookups.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">Google account</p>
                          <p className="text-xs text-muted-foreground">
                            Connect the Google account that owns or can access
                            your spreadsheet. After connecting, your
                            spreadsheets and tabs load automatically.
                          </p>
                        </div>
                        <Badge
                          variant={
                            googleSheetsStatus?.isConfigured
                              ? "default"
                              : "outline"
                          }
                        >
                          {googleSheetsStatus?.authMethod === "oauth" &&
                          googleSheetsStatus.email
                            ? googleSheetsStatus.email
                            : googleSheetsStatus?.isConfigured
                              ? "Connected"
                              : "Not connected"}
                        </Badge>
                      </div>

                      {!googleSheetsStatus?.oauthAvailable ? (
                        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                          Google sign-in is not configured on the server yet.
                          Ask your admin to set the Google OAuth environment
                          variables in Convex, or use an API key below.
                        </p>
                      ) : googleSheetsStatus?.authMethod !== "oauth" ? (
                        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                          Connect Google to browse your spreadsheets and sheet
                          tabs here.
                        </p>
                      ) : (
                        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
                          If spreadsheets do not appear, remove Osonflow from
                          your{" "}
                          <a
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Google account permissions
                          </a>
                          , then disconnect and reconnect here so Drive access
                          is granted. Also enable the Google Drive API in Google
                          Cloud Console for your OAuth project.
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
                            disabled={
                              isConnectingGoogle ||
                              !googleSheetsStatus?.oauthAvailable
                            }
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
                          onClick={() =>
                            setShowApiKeyFallback((current) => !current)
                          }
                        >
                          {showApiKeyFallback
                            ? "Hide API key option"
                            : "Use API key instead"}
                        </Button>
                      </div>

                      {showApiKeyFallback ? (
                        <div className="space-y-2 rounded-xl border border-dashed border-[var(--console-hairline-soft)] bg-muted/35 p-3">
                          <p className="text-xs text-muted-foreground">
                            Advanced: API key works only for public sheets or
                            sheets shared with your Google Cloud project.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              type="password"
                              value={googleApiKey}
                              onChange={(event) =>
                                setGoogleApiKey(event.target.value)
                              }
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
                              <Input
                                value={spreadsheetFilter}
                                onChange={(event) =>
                                  setSpreadsheetFilter(event.target.value)
                                }
                                placeholder="Filter spreadsheets..."
                                className="h-9"
                              />
                              <Select
                                value={editor.config.spreadsheetId || undefined}
                                onValueChange={(value) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        spreadsheetId: value,
                                      },
                                    }
                                  })
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
                                  {filteredSpreadsheetOptions.map((option) => (
                                    <SelectItem
                                      key={option.id}
                                      value={option.id}
                                    >
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {spreadsheetLoadError ? (
                                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                                  {spreadsheetLoadError}
                                </p>
                              ) : spreadsheetOptions.length === 0 &&
                                !isLoadingSpreadsheets ? (
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
                                  onClick={() =>
                                    setUseManualSpreadsheetId(true)
                                  }
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
                                  {isLoadingSpreadsheets
                                    ? "Refreshing..."
                                    : "Refresh list"}
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
                                  onClick={() =>
                                    setUseManualSpreadsheetId(false)
                                  }
                                >
                                  Choose from my Google Drive
                                </Button>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Connect Google account to browse your
                                  spreadsheets.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Sheet tab</Label>
                          {googleSheetsStatus?.isConfigured &&
                          sheetTabOptions.length > 0 ? (
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
                                    isLoadingSheetTabs
                                      ? "Loading tabs..."
                                      : "Choose a tab"
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
                                  config: {
                                    ...current.config,
                                    range: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Sheet1"
                              disabled={!editor.config.spreadsheetId?.trim()}
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            The tab inside your spreadsheet. Column headers load
                            automatically from the first row.
                          </p>
                        </div>
                      </div>
                      {(editor.config.operation ?? "lookup") === "lookup" ||
                      (editor.config.operation ?? "lookup") === "update" ||
                      (editor.config.operation ?? "lookup") === "delete" ? (
                        <SheetColumnPicker
                          label="Search columns"
                          description="Columns used to find the matching row. Tool parameters are generated from your selection."
                          columns={sheetColumnOptions}
                          selected={editor.config.searchColumns ?? []}
                          isLoading={isLoadingSheetColumns}
                          onChange={(columns) =>
                            handleSheetColumnsChange("searchColumns", columns)
                          }
                        />
                      ) : null}
                      {(editor.config.operation ?? "lookup") === "append" ? (
                        <SheetColumnPicker
                          label="Value columns"
                          description="Columns the assistant can fill when adding a new row."
                          columns={sheetColumnOptions}
                          selected={editor.config.valueColumns ?? []}
                          isLoading={isLoadingSheetColumns}
                          onChange={(columns) =>
                            handleSheetColumnsChange("valueColumns", columns)
                          }
                        />
                      ) : null}
                      {(editor.config.operation ?? "lookup") === "update" ? (
                        <SheetColumnPicker
                          label="Update columns"
                          description="Columns the assistant can change after finding a row."
                          columns={sheetColumnOptions}
                          selected={editor.config.updateColumns ?? []}
                          isLoading={isLoadingSheetColumns}
                          onChange={(columns) =>
                            handleSheetColumnsChange("updateColumns", columns)
                          }
                        />
                      ) : null}
                      {(editor.config.operation ?? "lookup") === "lookup" ? (
                        <SheetColumnPicker
                          label="Return columns (optional)"
                          description="Only these columns are sent back to the assistant. Leave empty to return all."
                          columns={sheetColumnOptions}
                          selected={editor.config.returnColumns ?? []}
                          isLoading={isLoadingSheetColumns}
                          onChange={(columns) =>
                            setEditor((current) => {
                              setIsDirty(true)
                              return {
                                ...current,
                                config: {
                                  ...current.config,
                                  returnColumns: columns,
                                },
                              }
                            })
                          }
                        />
                      ) : null}

                      <div className="space-y-3 console-inset p-3">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between text-left text-sm font-medium"
                          onClick={() =>
                            setShowAdvancedSheets((current) => !current)
                          }
                        >
                          <span>Advanced matching & scale</span>
                          <span className="text-xs text-muted-foreground">
                            {showAdvancedSheets ? "Hide" : "Show"}
                          </span>
                        </button>
                        {showAdvancedSheets ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Match mode</Label>
                              <Select
                                value={editor.config.matchMode ?? "exact"}
                                onValueChange={(
                                  value: "contains" | "exact" | "equals"
                                ) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        matchMode: value,
                                      },
                                    }
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GOOGLE_SHEETS_MATCH_MODE_OPTIONS.map(
                                    (option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {
                                  GOOGLE_SHEETS_MATCH_MODE_OPTIONS.find(
                                    (option) =>
                                      option.value ===
                                      (editor.config.matchMode ?? "exact")
                                  )?.description
                                }
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Query strategy</Label>
                              <Select
                                value={editor.config.queryStrategy ?? "gviz"}
                                onValueChange={(value: "gviz" | "scan") =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        queryStrategy: value,
                                      },
                                    }
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GOOGLE_SHEETS_QUERY_STRATEGY_OPTIONS.map(
                                    (option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {
                                  GOOGLE_SHEETS_QUERY_STRATEGY_OPTIONS.find(
                                    (option) =>
                                      option.value ===
                                      (editor.config.queryStrategy ?? "gviz")
                                  )?.description
                                }
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Max rows returned</Label>
                              <Input
                                type="number"
                                min={1}
                                max={200}
                                value={editor.config.maxLookupRows ?? 25}
                                onChange={(event) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        maxLookupRows: Number(
                                          event.target.value
                                        ),
                                      },
                                    }
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max scan rows (fallback)</Label>
                              <Input
                                type="number"
                                min={100}
                                max={50000}
                                value={editor.config.maxScanRows ?? 5000}
                                onChange={(event) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        maxScanRows: Number(event.target.value),
                                      },
                                    }
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Header row</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={editor.config.headerRow ?? 1}
                                onChange={(event) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        headerRow: Number(event.target.value),
                                      },
                                    }
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Data range (optional)</Label>
                              <Input
                                value={editor.config.dataRange ?? ""}
                                onChange={(event) =>
                                  setEditor((current) => {
                                    setIsDirty(true)
                                    return {
                                      ...current,
                                      config: {
                                        ...current.config,
                                        dataRange: event.target.value,
                                      },
                                    }
                                  })
                                }
                                placeholder="A1:Z5000"
                              />
                              <p className="text-xs text-muted-foreground">
                                Bounds fallback scans. Leave empty for auto
                                cap.
                              </p>
                            </div>
                            {(editor.config.operation ?? "lookup") ===
                              "update" ||
                            (editor.config.operation ?? "lookup") ===
                              "delete" ? (
                              <div className="flex items-center justify-between console-inset px-3 py-2 md:col-span-2">
                                <div>
                                  <p className="text-sm font-medium">
                                    Require unique match
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Block update/delete when more than one row
                                    matches.
                                  </p>
                                </div>
                                <Switch
                                  checked={
                                    editor.config.requireUniqueMatch ?? true
                                  }
                                  onCheckedChange={(checked) =>
                                    setEditor((current) => {
                                      setIsDirty(true)
                                      return {
                                        ...current,
                                        config: {
                                          ...current.config,
                                          requireUniqueMatch: checked,
                                        },
                                      }
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {selectedTool && selectedToolId !== "new" ? (
                        <div className="space-y-3 console-inset p-3">
                          <div>
                            <p className="text-sm font-medium">Test tool</p>
                            <p className="text-xs text-muted-foreground">
                              Run with sample JSON args against the live sheet
                              (uses saved tool config).
                            </p>
                          </div>
                          <Textarea
                            value={testArgsJson}
                            onChange={(event) =>
                              setTestArgsJson(event.target.value)
                            }
                            rows={4}
                            placeholder='{"Email":"jane@example.com"}'
                            className="font-mono text-xs"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isTesting || isDirty}
                              onClick={async () => {
                                setIsTesting(true)
                                setTestResult(null)
                                try {
                                  const parsed = JSON.parse(
                                    testArgsJson || "{}"
                                  ) as Record<string, unknown>
                                  const result = await testExecute({
                                    toolId: selectedTool._id,
                                    args: parsed,
                                  })
                                  setTestResult(result)
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : "Test failed"
                                  setTestResult(message)
                                  toast.error(message)
                                } finally {
                                  setIsTesting(false)
                                }
                              }}
                            >
                              {isTesting ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                "Run test"
                              )}
                            </Button>
                            {isDirty ? (
                              <p className="text-xs text-amber-600">
                                Save changes before testing.
                              </p>
                            ) : null}
                          </div>
                          {testResult ? (
                            <pre className="max-h-48 overflow-auto console-inset p-3 text-xs whitespace-pre-wrap">
                              {testResult}
                            </pre>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {(selectedTool?.type === "api_request" ||
                    newToolType === "api_request") && (
                    <div className="space-y-4 console-inset p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            value={editor.config.url ?? ""}
                            onChange={(event) =>
                              setEditor((current) => ({
                                ...current,
                                config: {
                                  ...current.config,
                                  url: event.target.value,
                                },
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
                          Use {"{{parameter_name}}"} placeholders for tool
                          arguments.
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedTool?.type === "custom_webhook" ||
                    newToolType === "custom_webhook") && (
                    <div className="space-y-4 console-inset p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input
                            value={editor.config.webhookUrl ?? ""}
                            onChange={(event) =>
                              setEditor((current) => {
                                setIsDirty(true)
                                return {
                                  ...current,
                                  config: {
                                    ...current.config,
                                    webhookUrl: event.target.value,
                                  },
                                }
                              })
                            }
                            placeholder="https://hooks.example.com/assistant-tool"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Method</Label>
                          <Select
                            value={editor.config.webhookMethod ?? "POST"}
                            onValueChange={(value: "GET" | "POST") =>
                              setEditor((current) => {
                                setIsDirty(true)
                                return {
                                  ...current,
                                  config: {
                                    ...current.config,
                                    webhookMethod: value,
                                  },
                                }
                              })
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
                    </div>
                  )}

                  {!selectedTool?.isBuiltin &&
                    selectedTool?.type !== "google_sheets" &&
                    newToolType !== "google_sheets" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Parameters</p>
                          <p className="text-xs text-muted-foreground">
                            Define the inputs the assistant can send to this
                            tool.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditor((current) => ({
                              ...current,
                              parameters: [
                                ...current.parameters,
                                createEmptyParameter(),
                              ],
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
                            className="space-y-3 console-inset p-4"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Name
                                </Label>
                                <Input
                                  value={parameter.name}
                                  onChange={(event) =>
                                    updateParameter(
                                      index,
                                      "name",
                                      event.target.value
                                    )
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
                                    updateParameter(
                                      index,
                                      "description",
                                      event.target.value
                                    )
                                  }
                                  placeholder="What this input represents"
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="min-w-[140px] flex-1 space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Type
                                </Label>
                                <Select
                                  value={parameter.type}
                                  onValueChange={(
                                    value: "string" | "number" | "boolean"
                                  ) => updateParameter(index, "type", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">
                                      String
                                    </SelectItem>
                                    <SelectItem value="number">
                                      Number
                                    </SelectItem>
                                    <SelectItem value="boolean">
                                      Boolean
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2 console-inset px-3 py-2">
                                <Switch
                                  checked={parameter.required}
                                  onCheckedChange={(checked) =>
                                    updateParameter(index, "required", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  Required
                                </span>
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
                                      (_, parameterIndex) =>
                                        parameterIndex !== index
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

              <div className="shrink-0 border-t border-[var(--console-hairline-soft)] bg-card px-5 py-4 sm:px-6">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <p className="text-center text-xs text-muted-foreground sm:mr-auto sm:text-left">
                    Changes apply to chat and voice when the corresponding
                    channel toggle is on.
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
