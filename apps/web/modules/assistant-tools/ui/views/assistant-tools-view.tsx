"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
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
  AudioLinesIcon,
  BracesIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  GlobeLockIcon,
  LayoutGridIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlugZapIcon,
  PlusIcon,
  SaveIcon,
  ServerCogIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquareTerminalIcon,
  Table2Icon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import {
  ConsoleHeader,
  ConsoleMeta,
  ConsoleSearch,
  ConsoleSkeleton,
  Panel,
  PanelBody,
  PanelHeader,
  Pill,
  toneClass,
} from "@/modules/dashboard/ui/components/console"
import {
  AVAILABLE_BLUEPRINTS,
  BLUEPRINTS_BY_ID,
  CATALOG_VENDOR_COUNT,
  FEATURED_BLUEPRINTS,
  resolveToolPresentation,
  type CatalogCategoryId,
  type ToolBlueprint,
  type ToolPresentation,
} from "../../catalog"
import {
  CHAT_MODEL_OPTIONS,
  createEmptyParameter,
  GOOGLE_SHEETS_MATCH_MODE_OPTIONS,
  GOOGLE_SHEETS_OPERATION_LABELS,
  GOOGLE_SHEETS_QUERY_STRATEGY_OPTIONS,
  type AssistantTool,
  type IntegrationToolType,
} from "../../constants"
import { buildGoogleSheetsParameters } from "../../lib/google-sheets-parameters"
import {
  AUTH_KIND_LABELS,
  CREDENTIAL_STATE_COPY,
  credentialState,
} from "../../lib/tool-auth"
import { BrandMark, brandStyle } from "../components/brand-mark"
import { ConnectionsInventory } from "../components/connections-inventory"
import { GoogleConnectionCard } from "../components/google-connection-card"
import { RequestHeadersEditor } from "../components/request-headers-editor"
import { SheetColumnPicker } from "../components/sheet-column-picker"
import { ToolCatalog } from "../components/tool-catalog"
import { ToolParametersEditor } from "../components/tool-parameters-editor"
import { RequestPreview } from "../components/request-preview"
import { ToolReadiness, type ReadinessStep } from "../components/tool-readiness"
import { ToolTestConsole } from "../components/tool-test-console"

type ToolEditorState = {
  name: string
  description: string
  enabledForChat: boolean
  enabledForVoice: boolean
  isEnabled: boolean
  parameters: AssistantTool["parameters"]
  config: NonNullable<AssistantTool["config"]>
}

type WorkspaceSection = "tools" | "catalog" | "connections"
type LibraryFilter = "all" | "chat" | "voice" | "off"
type EditorTab = "overview" | "setup" | "test"

const EDITOR_TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Configuration" },
  { id: "test", label: "Test" },
]

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
  parameters: tool.parameters,
  config: tool.config ?? {},
})

/** Mirrors the server's normalisation so the editor can preview the saved name. */
const previewToolName = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

const LIBRARY_FILTERS: Array<{ id: LibraryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "chat", label: "Chat" },
  { id: "voice", label: "Voice" },
  { id: "off", label: "Off" },
]

const SECTIONS: Array<{
  id: WorkspaceSection
  label: string
  icon: typeof WrenchIcon
}> = [
  { id: "tools", label: "Installed tools", icon: WrenchIcon },
  { id: "catalog", label: "Catalog", icon: LayoutGridIcon },
  { id: "connections", label: "Connections", icon: PlugZapIcon },
]

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

  const [section, setSection] = useState<WorkspaceSection>("tools")
  const [selectedToolId, setSelectedToolId] = useState<
    Id<"assistantTools"> | "new" | null
  >(null)
  const [newToolType, setNewToolType] = useState<IntegrationToolType | null>(
    null
  )
  const [activeBlueprintId, setActiveBlueprintId] = useState<string | null>(
    null
  )
  const [editor, setEditor] = useState<ToolEditorState>(defaultEditorState())
  const [libraryQuery, setLibraryQuery] = useState("")
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all")
  const [catalogQuery, setCatalogQuery] = useState("")
  const [catalogCategory, setCatalogCategory] = useState<
    CatalogCategoryId | "all"
  >("all")
  const [spreadsheetFilter, setSpreadsheetFilter] = useState("")
  const [showAdvancedSheets, setShowAdvancedSheets] = useState(false)
  const [editorTab, setEditorTab] = useState<EditorTab>("overview")
  const [isDirty, setIsDirty] = useState(false)
  const [googleApiKey, setGoogleApiKey] = useState("")
  const [showApiKeyFallback, setShowApiKeyFallback] = useState(false)
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
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
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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

  const matchesLibrary = (tool: AssistantTool) => {
    const query = libraryQuery.trim().toLowerCase()

    if (
      query &&
      !`${tool.name} ${tool.description} ${tool.type}`
        .toLowerCase()
        .includes(query)
    ) {
      return false
    }

    if (libraryFilter === "chat") return tool.isEnabled && tool.enabledForChat
    if (libraryFilter === "voice") return tool.isEnabled && tool.enabledForVoice
    if (libraryFilter === "off") return !tool.isEnabled

    return true
  }

  const filteredBuiltinTools = builtinTools.filter(matchesLibrary)
  const filteredIntegrationTools = integrationTools.filter(matchesLibrary)

  const installedCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const tool of tools ?? []) {
      const key = tool.isBuiltin
        ? `builtin_${tool.type}`
        : resolveToolPresentation(tool).blueprint?.id

      if (!key) continue
      counts[key] = (counts[key] ?? 0) + 1
    }

    return counts
  }, [tools])

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
  const isGoogleConnected = Boolean(googleSheetsStatus?.isConfigured)

  const activeBlueprint: ToolBlueprint | undefined = useMemo(() => {
    if (selectedTool) {
      return (
        resolveToolPresentation(selectedTool).blueprint ??
        (activeBlueprintId ? BLUEPRINTS_BY_ID[activeBlueprintId] : undefined)
      )
    }

    return activeBlueprintId ? BLUEPRINTS_BY_ID[activeBlueprintId] : undefined
  }, [activeBlueprintId, selectedTool])

  const presentation: ToolPresentation = selectedTool
    ? resolveToolPresentation(selectedTool)
    : activeBlueprint
      ? {
          icon: activeBlueprint.icon,
          tone: activeBlueprint.tone,
          brand: activeBlueprint.brand,
          vendor: activeBlueprint.vendor,
          typeLabel: activeBlueprint.title,
        }
      : {
          icon: WrenchIcon,
          tone: "neutral" as const,
          brand: "#64748b",
          vendor: "Custom",
          typeLabel: "New tool",
        }

  /* ── google sheets option loading ──────────────────────────────────── */

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        config: { ...current.config, range: sheetTabOptions[0] },
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

  /* ── editor plumbing ───────────────────────────────────────────────── */

  const patchEditor = (patch: Partial<ToolEditorState>) => {
    setIsDirty(true)
    setEditor((current) => ({ ...current, ...patch }))
  }

  const patchConfig = (patch: Partial<ToolEditorState["config"]>) => {
    setIsDirty(true)
    setEditor((current) => ({
      ...current,
      config: { ...current.config, ...patch },
    }))
  }

  /** Runs `action` immediately, or after the user resolves unsaved changes. */
  const guardUnsaved = (action: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => action)
      return
    }

    action()
  }

  const uniqueToolName = (base: string) => {
    const existing = new Set((tools ?? []).map((tool) => tool.name))

    if (!existing.has(base)) {
      return base
    }

    let index = 2
    while (existing.has(`${base}_${index}`)) {
      index += 1
    }

    return `${base}_${index}`
  }

  const openTool = (tool: AssistantTool) =>
    guardUnsaved(() => {
      setSection("tools")
      setSelectedToolId(tool._id)
      setNewToolType(null)
      setActiveBlueprintId(resolveToolPresentation(tool).blueprint?.id ?? null)
      setEditor(toolToEditorState(tool))
      setIsDirty(false)
      setShowAdvancedSheets(false)
      setEditorTab("overview")
    })

  const installBlueprint = (blueprint: ToolBlueprint) => {
    const draft = blueprint.draft?.()

    if (!draft) {
      return
    }

    guardUnsaved(() => {
      setSection("tools")
      setSelectedToolId("new")
      setNewToolType(draft.type)
      setActiveBlueprintId(blueprint.id)
      setEditor({
        name: uniqueToolName(draft.name),
        description: draft.description,
        enabledForChat: true,
        enabledForVoice: draft.enabledForVoice,
        isEnabled: true,
        parameters: draft.parameters,
        config: draft.config,
      })
      setIsDirty(true)
      setShowAdvancedSheets(draft.type === "google_sheets")
      setUseManualSpreadsheetId(false)
      // A freshly installed blueprint arrives with its identity already
      // written — what is missing is the endpoint and the credential.
      setEditorTab("setup")
    })
  }

  const configureBuiltin = (blueprint: ToolBlueprint) => {
    const tool = builtinTools.find(
      (entry) => entry.type === blueprint.builtinType
    )

    if (!tool) {
      toast.error("That built-in tool is still being prepared.")
      return
    }

    openTool(tool)
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

    if (selectedToolType === "api_request" && !editor.config.url?.trim()) {
      toast.error("Add the endpoint this tool should call")
      return
    }

    if (
      selectedToolType === "custom_webhook" &&
      !editor.config.webhookUrl?.trim()
    ) {
      toast.error("Add the webhook URL this tool should post to")
      return
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
        const toolId = await createTool({ type: newToolType, ...payload })
        setSelectedToolId(toolId)
        setNewToolType(null)
        toast.success("Tool created")
        setIsDirty(false)
      } else if (selectedTool) {
        await updateTool({ toolId: selectedTool._id, ...payload })
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

  const handleDuplicate = async () => {
    if (!selectedTool || selectedTool.isBuiltin) {
      return
    }

    setIsDuplicating(true)

    try {
      const toolId = await createTool({
        type: selectedTool.type as IntegrationToolType,
        name: uniqueToolName(`${selectedTool.name}_copy`),
        description: selectedTool.description,
        enabledForChat: selectedTool.enabledForChat,
        enabledForVoice: selectedTool.enabledForVoice,
        // A copy starts switched off so a half-edited clone never goes live.
        isEnabled: false,
        parameters: selectedTool.parameters,
        config: selectedTool.config ?? {},
      })

      setSelectedToolId(toolId)
      setNewToolType(null)
      setEditor({
        ...toolToEditorState(selectedTool),
        name: uniqueToolName(`${selectedTool.name}_copy`),
        isEnabled: false,
      })
      setIsDirty(false)
      toast.success("Tool duplicated — it stays off until you enable it")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to duplicate this tool"
      )
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTool || selectedTool.isBuiltin) return

    try {
      await removeTool({ toolId: selectedTool._id })
      setSelectedToolId(null)
      setActiveBlueprintId(null)
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

  const handleSheetColumnsChange = (
    field: "searchColumns" | "valueColumns" | "updateColumns",
    columns: string[]
  ) => {
    setIsDirty(true)
    setEditor((current) => {
      const nextConfig = { ...current.config, [field]: columns }
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

  const showEditor = selectedTool !== null || selectedToolId === "new"

  const saveShortcutRef = useRef<() => void>(() => {})

  useEffect(() => {
    saveShortcutRef.current = () => {
      if (!showEditor || isSaving) return
      void handleSave()
    }
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        saveShortcutRef.current()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const testBlockedReason = useMemo(() => {
    if (!selectedTool || selectedToolId === "new") {
      return "Save this tool before running a test."
    }

    if (isDirty) {
      return "Save your changes before running a test."
    }

    if (!editor.isEnabled) {
      return "Turn the tool on to run it."
    }

    if (!editor.enabledForChat) {
      return "Tests run over the chat channel — enable Chat first."
    }

    return null
  }, [
    editor.enabledForChat,
    editor.isEnabled,
    isDirty,
    selectedTool,
    selectedToolId,
  ])

  /* ── setup readiness ───────────────────────────────────────────────── */

  const blueprintAuth = activeBlueprint?.auth
  const credential = credentialState(editor.config, blueprintAuth)
  const endpointValue =
    (selectedToolType === "custom_webhook"
      ? editor.config.webhookUrl
      : editor.config.url
    )?.trim() ?? ""

  const readinessSteps: ReadinessStep[] = (() => {
    const steps: ReadinessStep[] = [
      {
        id: "identity",
        label: "Named and described",
        description:
          "The description is the only thing telling the model when to reach for this tool.",
        done: Boolean(editor.name.trim() && editor.description.trim()),
      },
    ]

    if (isGoogleSheetsEditor) {
      steps.push(
        {
          id: "google",
          label: "Google account connected",
          description: "Connect once — every Sheets tool reuses the grant.",
          done: isGoogleConnected,
        },
        {
          id: "sheet",
          label: "Spreadsheet and tab chosen",
          description: "Column headers load from the first row of that tab.",
          done: Boolean(
            editor.config.spreadsheetId?.trim() && editor.config.range?.trim()
          ),
        },
        {
          id: "columns",
          label: "Columns selected",
          description:
            "The columns you pick become the arguments the assistant may send.",
          done:
            (editor.config.searchColumns?.length ?? 0) > 0 ||
            (editor.config.valueColumns?.length ?? 0) > 0,
        }
      )
    } else if (!selectedTool?.isBuiltin) {
      steps.push({
        id: "endpoint",
        label: "Endpoint set",
        description: "Where the request goes when the model calls this tool.",
        done: Boolean(endpointValue),
      })

      if (credential !== "not_required") {
        steps.push({
          id: "credential",
          label: blueprintAuth?.label ?? "Credential added",
          description:
            credential === "placeholder"
              ? "The template's example value is still in place."
              : "The provider will refuse the call without it.",
          done: credential === "set",
        })
      }

      steps.push({
        id: "arguments",
        label: "Arguments named",
        description: "Every parameter needs a name the model can fill.",
        done: editor.parameters.every((parameter) => parameter.name.trim()),
      })
    }

    steps.push({
      id: "live",
      label: "Saved and switched on",
      description: isDirty
        ? "Unsaved changes are not live yet."
        : "Turn the tool on for at least one channel.",
      done:
        !isDirty &&
        selectedToolId !== "new" &&
        editor.isEnabled &&
        (editor.enabledForChat || editor.enabledForVoice),
    })

    return steps
  })()

  const readyCount = readinessSteps.filter((step) => step.done).length
  const isToolReady = readyCount === readinessSteps.length

  if (tools === undefined) {
    return <ConsoleSkeleton rows={3} stats={0} />
  }

  const activeCount = tools.filter((tool) => tool.isEnabled).length
  const chatCount = tools.filter(
    (tool) => tool.isEnabled && tool.enabledForChat
  ).length
  const voiceCount = tools.filter(
    (tool) => tool.isEnabled && tool.enabledForVoice
  ).length

  /* ── library rail ──────────────────────────────────────────────────── */

  const renderToolRow = (tool: AssistantTool) => {
    const rowPresentation = resolveToolPresentation(tool)
    const RowIcon = rowPresentation.icon
    const isSelected = selectedToolId === tool._id

    return (
      <button
        className={cn(
          "console-row flex w-full items-start gap-3 rounded-[10px] border px-2.5 py-2.5 text-left",
          isSelected
            ? "border-[var(--console-hairline)] bg-muted/70"
            : "border-transparent hover:border-[var(--console-hairline-soft)]"
        )}
        key={tool._id}
        onClick={() => openTool(tool)}
        type="button"
      >
        <BrandMark
          brand={rowPresentation.brand}
          icon={RowIcon}
          muted={!tool.isEnabled}
          size="sm"
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-[0.78rem] font-medium text-foreground">
              {tool.name}
            </span>
            {!tool.isEnabled ? (
              <span className="shrink-0 rounded-full border border-[var(--console-hairline-soft)] px-1.5 text-[0.62rem] leading-4 text-muted-foreground">
                Off
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">
            {tool.description}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-[0.66rem] text-muted-foreground">
            <span className="truncate">{rowPresentation.vendor}</span>
            {tool.isEnabled && tool.enabledForChat ? (
              <span className="console-tone-info inline-flex items-center gap-1">
                <MessageSquareIcon className="size-3" />
                Chat
              </span>
            ) : null}
            {tool.isEnabled && tool.enabledForVoice ? (
              <span className="console-tone-accent inline-flex items-center gap-1">
                <AudioLinesIcon className="size-3" />
                Voice
              </span>
            ) : null}
          </span>
        </span>
      </button>
    )
  }

  /** Installed integrations, gathered under the vendor they belong to. */
  const integrationGroups = (() => {
    const groups = new Map<string, AssistantTool[]>()

    for (const tool of filteredIntegrationTools) {
      const vendor = resolveToolPresentation(tool).vendor
      const bucket = groups.get(vendor)

      if (bucket) {
        bucket.push(tool)
        continue
      }

      groups.set(vendor, [tool])
    }

    return [...groups.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )
  })()

  const EditorIcon = presentation.icon
  const operation = editor.config.operation ?? "lookup"
  const activeEditorTab: EditorTab =
    selectedTool?.isBuiltin && editorTab === "setup" ? "overview" : editorTab

  return (
    <div className="console-page flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-5 sm:px-6">
        <div className="mx-auto w-full max-w-[1540px]">
          <ConsoleHeader
            actions={
              <Button
                onClick={() => guardUnsaved(() => setSection("catalog"))}
                type="button"
              >
                <PlusIcon />
                Add a tool
              </Button>
            }
            description="Everything your chat and voice assistants are allowed to call — what each tool does, which channel it runs on, and exactly how the call is shaped."
            eyebrow="Capabilities"
            icon={WrenchIcon}
            meta={
              <>
                <ConsoleMeta
                  dot
                  label="Active"
                  tone="positive"
                  value={activeCount}
                />
                <ConsoleMeta label="Chat" value={chatCount} />
                <ConsoleMeta label="Voice" value={voiceCount} />
                <ConsoleMeta
                  label="Integrations"
                  value={integrationTools.length}
                />
                <ConsoleMeta
                  dot
                  label="Google"
                  tone={isGoogleConnected ? "positive" : "neutral"}
                  value={isGoogleConnected ? "Connected" : "Not connected"}
                />
                <ConsoleMeta
                  label="Catalog"
                  value={`${AVAILABLE_BLUEPRINTS.length} offerings · ${CATALOG_VENDOR_COUNT} vendors`}
                />
              </>
            }
            title="Assistant tools"
          />

          <div className="console-segment mt-4 mb-4 flex w-full flex-wrap gap-1 sm:inline-flex sm:w-auto">
            {SECTIONS.map((entry) => {
              const SectionIcon = entry.icon
              return (
                <button
                  className={cn(
                    "console-segment-item flex items-center gap-2 border border-transparent px-3 py-1.5 text-[0.8rem] font-medium",
                    section === entry.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-active={section === entry.id || undefined}
                  key={entry.id}
                  onClick={() => guardUnsaved(() => setSection(entry.id))}
                  type="button"
                >
                  <SectionIcon className="size-4" />
                  {entry.label}
                  {entry.id === "tools" ? (
                    <span className="console-numeral text-[0.66rem] text-muted-foreground">
                      {tools.length}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {section === "tools" ? (
        <div className="mx-auto flex min-h-0 w-full max-w-[1540px] flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6 lg:flex-row">
          <aside className="console-card flex max-h-[min(360px,40vh)] w-full shrink-0 flex-col overflow-hidden lg:h-full lg:max-h-none lg:w-[320px] lg:max-w-[320px]">
            <div className="shrink-0 space-y-3 border-b border-[var(--console-hairline-soft)] px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="console-section-title">Installed</h2>
                <span className="console-numeral text-xs text-muted-foreground">
                  {filteredBuiltinTools.length +
                    filteredIntegrationTools.length}
                  {" / "}
                  {tools.length}
                </span>
              </div>
              <ConsoleSearch
                onChange={setLibraryQuery}
                placeholder="Search installed tools…"
                value={libraryQuery}
              />
              <div className="console-segment flex gap-1">
                {LIBRARY_FILTERS.map((filter) => (
                  <button
                    className={cn(
                      "console-segment-item flex-1 border border-transparent px-2 py-1 text-[0.72rem] font-medium",
                      libraryFilter === filter.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    data-active={libraryFilter === filter.id || undefined}
                    key={filter.id}
                    onClick={() => setLibraryFilter(filter.id)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-3">
                <section>
                  <p className="console-label mb-1.5 px-1">Assistant actions</p>
                  <div className="space-y-1">
                    {filteredBuiltinTools.length === 0 ? (
                      <p className="rounded-[10px] border border-dashed border-[var(--console-hairline-soft)] px-3 py-3 text-center text-xs text-muted-foreground">
                        {builtinTools.length === 0
                          ? "Default tools are being prepared…"
                          : "Nothing matches this filter."}
                      </p>
                    ) : (
                      filteredBuiltinTools.map(renderToolRow)
                    )}
                  </div>
                </section>

                {filteredIntegrationTools.length === 0 ? (
                  <section>
                    <p className="console-label mb-1.5 px-1">Integrations</p>
                    <div className="rounded-[10px] border border-dashed border-[var(--console-hairline-soft)] px-3 py-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        {integrationTools.length === 0
                          ? "No integrations yet."
                          : "Nothing matches this filter."}
                      </p>
                      {integrationTools.length === 0 ? (
                        <Button
                          className="mt-2"
                          onClick={() =>
                            guardUnsaved(() => setSection("catalog"))
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Browse the catalog
                        </Button>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  integrationGroups.map(([vendor, vendorTools]) => (
                    <section key={vendor}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                        <p className="console-label truncate">{vendor}</p>
                        <span className="console-numeral text-[0.66rem] text-muted-foreground">
                          {vendorTools.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {vendorTools.map(renderToolRow)}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-[var(--console-hairline-soft)] p-3">
              <Button
                className="w-full"
                onClick={() => guardUnsaved(() => setSection("catalog"))}
                size="sm"
                type="button"
                variant="outline"
              >
                <LayoutGridIcon />
                Browse catalog
              </Button>
            </div>
          </aside>

          <section className="console-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!showEditor ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
                <span className="console-medallion size-12">
                  <WrenchIcon className="size-5" />
                </span>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  Select a tool to configure
                </p>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Pick an installed tool on the left to tune what it does — or
                  start from one of these.
                </p>

                <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
                  {FEATURED_BLUEPRINTS.slice(0, 4).map((blueprint) => {
                    const SuggestionIcon = blueprint.icon

                    return (
                      <button
                        className="brand-edge console-card console-interactive flex items-center gap-3 p-3 text-left"
                        key={blueprint.id}
                        onClick={() => {
                          if (blueprint.requiresGoogle && !isGoogleConnected) {
                            guardUnsaved(() => setSection("connections"))
                            return
                          }

                          installBlueprint(blueprint)
                        }}
                        style={brandStyle(blueprint.brand)}
                        type="button"
                      >
                        <BrandMark
                          brand={blueprint.brand}
                          icon={SuggestionIcon}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.82rem] font-medium">
                            {blueprint.title}
                          </span>
                          <span className="block truncate text-[0.7rem] text-muted-foreground">
                            {blueprint.vendor}
                          </span>
                        </span>
                        <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>

                <Button
                  className="mt-5"
                  onClick={() => setSection("catalog")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LayoutGridIcon />
                  Browse all {AVAILABLE_BLUEPRINTS.length} offerings
                </Button>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-[var(--console-hairline-soft)] px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <BrandMark
                        brand={presentation.brand}
                        icon={EditorIcon}
                        muted={!editor.isEnabled}
                      />
                      <div className="min-w-0">
                        <p className="console-eyebrow truncate">
                          {presentation.vendor}
                        </p>
                        <h2 className="console-section-title mt-1.5 truncate text-[0.95rem]">
                          {presentation.typeLabel}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Pill
                            tone={editor.isEnabled ? "positive" : "neutral"}
                          >
                            {editor.isEnabled ? "Live" : "Off"}
                          </Pill>
                          {editor.enabledForChat ? (
                            <Pill icon={MessageSquareIcon} tone="info">
                              Chat
                            </Pill>
                          ) : null}
                          {editor.enabledForVoice && !isVoiceUnsupportedTool ? (
                            <Pill icon={AudioLinesIcon} tone="accent">
                              Voice
                            </Pill>
                          ) : null}
                          {selectedTool?.isBuiltin ? (
                            <Pill icon={ShieldCheckIcon} tone="neutral">
                              Built-in
                            </Pill>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {selectedTool && !selectedTool.isBuiltin ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          disabled={isDuplicating}
                          onClick={handleDuplicate}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {isDuplicating ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <CopyIcon />
                          )}
                          Duplicate
                        </Button>
                        <Button
                          className="text-destructive"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2Icon />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="console-segment flex gap-1">
                      {EDITOR_TABS.filter(
                        (tab) =>
                          !(selectedTool?.isBuiltin && tab.id === "setup")
                      ).map((tab) => (
                        <button
                          className={cn(
                            "console-segment-item border border-transparent px-3 py-1.5 text-[0.78rem] font-medium",
                            activeEditorTab === tab.id
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-active={activeEditorTab === tab.id || undefined}
                          key={tab.id}
                          onClick={() => setEditorTab(tab.id)}
                          type="button"
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      className="flex items-center gap-2 text-xs transition-colors hover:text-foreground"
                      onClick={() => setEditorTab("overview")}
                      type="button"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "console-dot",
                          isToolReady ? toneClass.positive : toneClass.warning
                        )}
                      />
                      <span className="text-muted-foreground">
                        {isToolReady
                          ? "Ready to call"
                          : `${readyCount} of ${readinessSteps.length} set up`}
                      </span>
                    </button>
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-4 p-4 sm:p-5">
                    {activeBlueprint?.setupHint ? (
                      <div className="console-inset flex items-start gap-2.5 px-3.5 py-3">
                        <SlidersHorizontalIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {activeBlueprint.setupHint}
                          {activeBlueprint.docsUrl ? (
                            <>
                              {" "}
                              <a
                                className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
                                href={activeBlueprint.docsUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Provider docs
                                <ExternalLinkIcon className="size-3" />
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ) : null}

                    {activeEditorTab === "overview" ? (
                      <>
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                          <Panel quiet>
                            <PanelHeader
                              description="What is still missing before this tool can answer a real conversation."
                              icon={ShieldCheckIcon}
                              title="Readiness"
                            />
                            <PanelBody>
                              <ToolReadiness steps={readinessSteps} />
                            </PanelBody>
                          </Panel>

                          <Panel quiet>
                            <PanelHeader
                              description="How this tool reaches the outside world."
                              icon={PlugZapIcon}
                              title="Connection"
                            />
                            <PanelBody className="space-y-3">
                              <div className="console-inset flex items-start justify-between gap-3 px-3.5 py-3">
                                <div className="min-w-0">
                                  <p className="console-label">Vendor</p>
                                  <p className="mt-1 truncate text-sm font-medium">
                                    {presentation.vendor}
                                  </p>
                                </div>
                                <Pill tone={presentation.tone}>
                                  {presentation.typeLabel}
                                </Pill>
                              </div>

                              {selectedTool?.isBuiltin ? (
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                  Built-in actions run inside Osonflow. There is
                                  no endpoint to configure and no credential to
                                  store.
                                </p>
                              ) : (
                                <>
                                  <div className="console-inset px-3.5 py-3">
                                    <p className="console-label">Endpoint</p>
                                    <p className="mt-1 truncate font-mono text-xs text-foreground">
                                      {endpointValue || "Not set yet"}
                                    </p>
                                  </div>

                                  <div className="console-inset flex items-start justify-between gap-3 px-3.5 py-3">
                                    <div className="min-w-0">
                                      <p className="console-label">
                                        Credential
                                      </p>
                                      <p className="mt-1 truncate text-sm">
                                        {credential === "not_required"
                                          ? blueprintAuth
                                            ? AUTH_KIND_LABELS[
                                                blueprintAuth.kind
                                              ]
                                            : "None required"
                                          : CREDENTIAL_STATE_COPY[credential]}
                                      </p>
                                    </div>
                                    <Pill
                                      tone={
                                        credential === "set" ||
                                        credential === "not_required"
                                          ? "positive"
                                          : "warning"
                                      }
                                    >
                                      {credential === "set" ||
                                      credential === "not_required"
                                        ? "OK"
                                        : "Needs input"}
                                    </Pill>
                                  </div>

                                  <Button
                                    className="w-full"
                                    onClick={() => setEditorTab("setup")}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    <SlidersHorizontalIcon />
                                    Open configuration
                                  </Button>
                                </>
                              )}
                            </PanelBody>
                          </Panel>
                        </div>

                        {/* ── identity ─────────────────────────────────── */}
                        <Panel quiet>
                          <PanelHeader
                            description="How the model refers to this tool, and when it should reach for it."
                            icon={BracesIcon}
                            title="Identity"
                          />
                          <PanelBody className="space-y-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                              <div className="space-y-1.5">
                                <Label htmlFor="tool-name">Tool name</Label>
                                <Input
                                  className="font-mono text-xs"
                                  disabled={selectedTool?.isBuiltin}
                                  id="tool-name"
                                  onChange={(event) =>
                                    patchEditor({ name: event.target.value })
                                  }
                                  placeholder="lookup_account"
                                  value={editor.name}
                                />
                                <p className="text-xs text-muted-foreground">
                                  {editor.name &&
                                  previewToolName(editor.name) !==
                                    editor.name ? (
                                    <>
                                      Saved as{" "}
                                      <code className="font-mono text-foreground">
                                        {previewToolName(editor.name) || "—"}
                                      </code>
                                    </>
                                  ) : (
                                    "Letters, numbers and underscores, starting with a letter."
                                  )}
                                </p>
                              </div>

                              <div className="console-inset space-y-3 p-3.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                      Enabled
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Master switch for this tool
                                    </p>
                                  </div>
                                  <Switch
                                    checked={editor.isEnabled}
                                    onCheckedChange={(checked) =>
                                      patchEditor({ isEnabled: checked })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">Chat</p>
                                    <p className="text-xs text-muted-foreground">
                                      Widget and connected channels
                                    </p>
                                  </div>
                                  <Switch
                                    checked={editor.enabledForChat}
                                    onCheckedChange={(checked) =>
                                      patchEditor({ enabledForChat: checked })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">Voice</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isVoiceUnsupportedTool
                                        ? "Voice cannot hand off or resolve"
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
                                      patchEditor({ enabledForVoice: checked })
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="tool-description">
                                When to use it
                              </Label>
                              <Textarea
                                id="tool-description"
                                onChange={(event) =>
                                  patchEditor({
                                    description: event.target.value,
                                  })
                                }
                                placeholder="Look up an account from the customer's name and the last 4 digits of their phone number."
                                rows={3}
                                value={editor.description}
                              />
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground">
                                  The model reads this to decide whether to call
                                  the tool — be specific about the trigger.
                                </p>
                                <p className="console-numeral shrink-0 text-xs text-muted-foreground">
                                  {editor.description.length}/1000
                                </p>
                              </div>
                            </div>

                            {selectedTool?.type === "query" ? (
                              <div className="space-y-1.5">
                                <Label>Knowledge base model</Label>
                                <Select
                                  onValueChange={(value) =>
                                    patchConfig({ knowledgeBaseModel: value })
                                  }
                                  value={
                                    editor.config.knowledgeBaseModel ??
                                    "gpt-4o-mini"
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CHAT_MODEL_OPTIONS.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Used to interpret knowledge base search
                                  results before they reach the assistant.
                                </p>
                              </div>
                            ) : null}
                          </PanelBody>
                        </Panel>
                      </>
                    ) : null}

                    {activeEditorTab === "setup" ? (
                      <>
                        {/* ── google sheets ────────────────────────────────── */}
                        {isGoogleSheetsEditor ? (
                          <Panel quiet>
                            <PanelHeader
                              actions={
                                <Pill tone="positive">
                                  {GOOGLE_SHEETS_OPERATION_LABELS[operation]}
                                </Pill>
                              }
                              description="The spreadsheet this tool reads or writes, and the columns it is allowed to touch."
                              icon={Table2Icon}
                              title="Spreadsheet"
                            />
                            <PanelBody className="space-y-4">
                              <GoogleConnectionCard
                                apiKey={googleApiKey}
                                isConnecting={isConnectingGoogle}
                                isDisconnecting={isDisconnectingGoogle}
                                isRefreshing={isLoadingSpreadsheets}
                                isSavingApiKey={isSavingGoogleKey}
                                loadError={spreadsheetLoadError}
                                onApiKeyChange={setGoogleApiKey}
                                onConnect={handleConnectGoogle}
                                onDisconnect={handleDisconnectGoogle}
                                onManage={() =>
                                  guardUnsaved(() => setSection("connections"))
                                }
                                onRefresh={() => void loadSpreadsheetOptions()}
                                onSaveApiKey={handleSaveGoogleKey}
                                onToggleApiKeyFallback={() =>
                                  setShowApiKeyFallback((current) => !current)
                                }
                                showApiKeyFallback={showApiKeyFallback}
                                spreadsheetCount={spreadsheetOptions.length}
                                status={googleSheetsStatus}
                                variant="compact"
                              />

                              {operation !== "lookup" &&
                              googleSheetsStatus?.authMethod === "api_key" ? (
                                <p className="console-tone-warning console-tone-wash rounded-[10px] border px-3 py-2 text-xs">
                                  API key access only supports lookups. Connect
                                  a Google account to add, update or delete
                                  rows.
                                </p>
                              ) : null}

                              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                                <div className="space-y-2">
                                  <Label>Spreadsheet</Label>
                                  {googleSheetsStatus?.authMethod === "oauth" &&
                                  !useManualSpreadsheetId ? (
                                    <>
                                      <Input
                                        className="h-9"
                                        onChange={(event) =>
                                          setSpreadsheetFilter(
                                            event.target.value
                                          )
                                        }
                                        placeholder="Filter spreadsheets…"
                                        value={spreadsheetFilter}
                                      />
                                      <Select
                                        disabled={isLoadingSpreadsheets}
                                        onValueChange={(value) =>
                                          patchConfig({ spreadsheetId: value })
                                        }
                                        value={
                                          editor.config.spreadsheetId ||
                                          undefined
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue
                                            placeholder={
                                              isLoadingSpreadsheets
                                                ? "Loading your spreadsheets…"
                                                : "Choose a spreadsheet"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {filteredSpreadsheetOptions.map(
                                            (option) => (
                                              <SelectItem
                                                key={option.id}
                                                value={option.id}
                                              >
                                                {option.name}
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {spreadsheetOptions.length === 0 &&
                                      !isLoadingSpreadsheets &&
                                      !spreadsheetLoadError ? (
                                        <p className="text-xs text-muted-foreground">
                                          No spreadsheets found in this Google
                                          account.
                                        </p>
                                      ) : null}
                                      <Button
                                        className="h-auto px-0"
                                        onClick={() =>
                                          setUseManualSpreadsheetId(true)
                                        }
                                        size="sm"
                                        type="button"
                                        variant="link"
                                      >
                                        Enter a spreadsheet ID manually
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Input
                                        className="font-mono text-xs"
                                        onChange={(event) =>
                                          patchConfig({
                                            spreadsheetId: event.target.value,
                                          })
                                        }
                                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                                        value={
                                          editor.config.spreadsheetId ?? ""
                                        }
                                      />
                                      {googleSheetsStatus?.authMethod ===
                                      "oauth" ? (
                                        <Button
                                          className="h-auto px-0"
                                          onClick={() =>
                                            setUseManualSpreadsheetId(false)
                                          }
                                          size="sm"
                                          type="button"
                                          variant="link"
                                        >
                                          Choose from my Google Drive
                                        </Button>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">
                                          Connect a Google account to browse
                                          your spreadsheets.
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
                                      disabled={isLoadingSheetTabs}
                                      onValueChange={(value) =>
                                        patchConfig({ range: value })
                                      }
                                      value={editor.config.range || undefined}
                                    >
                                      <SelectTrigger>
                                        <SelectValue
                                          placeholder={
                                            isLoadingSheetTabs
                                              ? "Loading tabs…"
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
                                      disabled={
                                        !editor.config.spreadsheetId?.trim()
                                      }
                                      onChange={(event) =>
                                        patchConfig({
                                          range: event.target.value,
                                        })
                                      }
                                      placeholder="Sheet1"
                                      value={editor.config.range ?? ""}
                                    />
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Column headers load from the first row of
                                    this tab.
                                  </p>
                                </div>
                              </div>

                              {operation === "lookup" ||
                              operation === "update" ||
                              operation === "delete" ? (
                                <SheetColumnPicker
                                  columns={sheetColumnOptions}
                                  description="Columns used to find the matching row. Tool parameters are generated from this selection."
                                  isLoading={isLoadingSheetColumns}
                                  label="Search columns"
                                  onChange={(columns) =>
                                    handleSheetColumnsChange(
                                      "searchColumns",
                                      columns
                                    )
                                  }
                                  selected={editor.config.searchColumns ?? []}
                                />
                              ) : null}

                              {operation === "append" ? (
                                <SheetColumnPicker
                                  columns={sheetColumnOptions}
                                  description="Columns the assistant can fill when adding a new row."
                                  isLoading={isLoadingSheetColumns}
                                  label="Value columns"
                                  onChange={(columns) =>
                                    handleSheetColumnsChange(
                                      "valueColumns",
                                      columns
                                    )
                                  }
                                  selected={editor.config.valueColumns ?? []}
                                />
                              ) : null}

                              {operation === "update" ? (
                                <SheetColumnPicker
                                  columns={sheetColumnOptions}
                                  description="Columns the assistant can change after finding a row."
                                  isLoading={isLoadingSheetColumns}
                                  label="Update columns"
                                  onChange={(columns) =>
                                    handleSheetColumnsChange(
                                      "updateColumns",
                                      columns
                                    )
                                  }
                                  selected={editor.config.updateColumns ?? []}
                                />
                              ) : null}

                              {operation === "lookup" ? (
                                <SheetColumnPicker
                                  columns={sheetColumnOptions}
                                  description="Only these columns are returned to the assistant. Leave empty to return all of them."
                                  isLoading={isLoadingSheetColumns}
                                  label="Return columns (optional)"
                                  onChange={(columns) =>
                                    patchConfig({ returnColumns: columns })
                                  }
                                  selected={editor.config.returnColumns ?? []}
                                />
                              ) : null}

                              <div className="console-inset overflow-hidden">
                                <button
                                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
                                  onClick={() =>
                                    setShowAdvancedSheets((current) => !current)
                                  }
                                  type="button"
                                >
                                  <span className="text-sm font-medium">
                                    Matching &amp; scale
                                  </span>
                                  <ChevronDownIcon
                                    className={cn(
                                      "size-4 text-muted-foreground transition-transform",
                                      showAdvancedSheets && "rotate-180"
                                    )}
                                  />
                                </button>

                                {showAdvancedSheets ? (
                                  <div className="grid gap-4 border-t border-[var(--console-hairline-soft)] p-3.5 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                      <Label>Match mode</Label>
                                      <Select
                                        onValueChange={(
                                          value: "contains" | "exact" | "equals"
                                        ) => patchConfig({ matchMode: value })}
                                        value={
                                          editor.config.matchMode ?? "exact"
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
                                              (editor.config.matchMode ??
                                                "exact")
                                          )?.description
                                        }
                                      </p>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label>Query strategy</Label>
                                      <Select
                                        onValueChange={(
                                          value: "gviz" | "scan"
                                        ) =>
                                          patchConfig({ queryStrategy: value })
                                        }
                                        value={
                                          editor.config.queryStrategy ?? "gviz"
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
                                              (editor.config.queryStrategy ??
                                                "gviz")
                                          )?.description
                                        }
                                      </p>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label>Max rows returned</Label>
                                      <Input
                                        max={200}
                                        min={1}
                                        onChange={(event) =>
                                          patchConfig({
                                            maxLookupRows: Number(
                                              event.target.value
                                            ),
                                          })
                                        }
                                        type="number"
                                        value={
                                          editor.config.maxLookupRows ?? 25
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label>Max scan rows (fallback)</Label>
                                      <Input
                                        max={50000}
                                        min={100}
                                        onChange={(event) =>
                                          patchConfig({
                                            maxScanRows: Number(
                                              event.target.value
                                            ),
                                          })
                                        }
                                        type="number"
                                        value={
                                          editor.config.maxScanRows ?? 5000
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label>Header row</Label>
                                      <Input
                                        max={100}
                                        min={1}
                                        onChange={(event) =>
                                          patchConfig({
                                            headerRow: Number(
                                              event.target.value
                                            ),
                                          })
                                        }
                                        type="number"
                                        value={editor.config.headerRow ?? 1}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label>Data range (optional)</Label>
                                      <Input
                                        onChange={(event) =>
                                          patchConfig({
                                            dataRange: event.target.value,
                                          })
                                        }
                                        placeholder="A1:Z5000"
                                        value={editor.config.dataRange ?? ""}
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Bounds fallback scans. Leave empty for
                                        the automatic cap.
                                      </p>
                                    </div>

                                    {operation === "update" ||
                                    operation === "delete" ? (
                                      <div className="console-inset flex items-center justify-between gap-3 px-3 py-2.5 md:col-span-2">
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium">
                                            Require a unique match
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Blocks the write when more than one
                                            row matches.
                                          </p>
                                        </div>
                                        <Switch
                                          checked={
                                            editor.config.requireUniqueMatch ??
                                            true
                                          }
                                          onCheckedChange={(checked) =>
                                            patchConfig({
                                              requireUniqueMatch: checked,
                                            })
                                          }
                                        />
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </PanelBody>
                          </Panel>
                        ) : null}

                        {/* ── api request ──────────────────────────────────── */}
                        {selectedToolType === "api_request" ? (
                          <Panel quiet>
                            <PanelHeader
                              description="Where the call goes, how it is authenticated, and the body the assistant's arguments are poured into."
                              icon={ServerCogIcon}
                              title="Endpoint"
                            />
                            <PanelBody className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                                <div className="space-y-1.5">
                                  <Label>Method</Label>
                                  <Select
                                    onValueChange={(value: "GET" | "POST") =>
                                      patchConfig({ method: value })
                                    }
                                    value={editor.config.method ?? "POST"}
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
                                <div className="space-y-1.5">
                                  <Label>URL</Label>
                                  <Input
                                    className="font-mono text-xs"
                                    onChange={(event) =>
                                      patchConfig({ url: event.target.value })
                                    }
                                    placeholder={
                                      activeBlueprint?.endpointPlaceholder ??
                                      "https://api.example.com/v1/lookup"
                                    }
                                    value={editor.config.url ?? ""}
                                  />
                                </div>
                              </div>

                              <RequestHeadersEditor
                                authSpec={blueprintAuth}
                                key={`headers-${String(selectedToolId ?? "new")}`}
                                onChange={(value) =>
                                  patchConfig({ headersJson: value })
                                }
                                value={editor.config.headersJson ?? "{}"}
                              />

                              {(editor.config.method ?? "POST") === "POST" ? (
                                <div className="space-y-1.5">
                                  <Label>Body template</Label>
                                  <Textarea
                                    className="font-mono text-xs"
                                    onChange={(event) =>
                                      patchConfig({
                                        bodyTemplate: event.target.value,
                                      })
                                    }
                                    rows={7}
                                    value={editor.config.bodyTemplate ?? ""}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Use{" "}
                                    <code className="font-mono text-foreground">
                                      {"{{parameter_name}}"}
                                    </code>{" "}
                                    placeholders. Leave the template empty to
                                    post the raw arguments as JSON.
                                  </p>
                                </div>
                              ) : (
                                <p className="console-inset px-3 py-2.5 text-xs text-muted-foreground">
                                  On a GET request every parameter is appended
                                  to the URL as a query string value.
                                </p>
                              )}
                            </PanelBody>
                          </Panel>
                        ) : null}

                        {/* ── custom webhook ───────────────────────────────── */}
                        {selectedToolType === "custom_webhook" ? (
                          <Panel quiet>
                            <PanelHeader
                              description="The assistant's arguments are delivered to this endpoint as a flat JSON object."
                              icon={SquareTerminalIcon}
                              title="Webhook"
                            />
                            <PanelBody>
                              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                                <div className="space-y-1.5">
                                  <Label>Method</Label>
                                  <Select
                                    onValueChange={(value: "GET" | "POST") =>
                                      patchConfig({ webhookMethod: value })
                                    }
                                    value={
                                      editor.config.webhookMethod ?? "POST"
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
                                <div className="space-y-1.5">
                                  <Label>Webhook URL</Label>
                                  <Input
                                    className="font-mono text-xs"
                                    onChange={(event) =>
                                      patchConfig({
                                        webhookUrl: event.target.value,
                                      })
                                    }
                                    placeholder={
                                      activeBlueprint?.endpointPlaceholder ??
                                      "https://hooks.example.com/assistant-tool"
                                    }
                                    value={editor.config.webhookUrl ?? ""}
                                  />
                                </div>
                              </div>
                            </PanelBody>
                          </Panel>
                        ) : null}

                        {/* ── parameters ───────────────────────────────────── */}
                        {!selectedTool?.isBuiltin && !isGoogleSheetsEditor ? (
                          <Panel quiet>
                            <PanelHeader
                              description="The inputs the model is allowed to send. Names and descriptions are part of the prompt."
                              icon={BracesIcon}
                              title="Parameters"
                            />
                            <PanelBody>
                              <ToolParametersEditor
                                onChange={(parameters) =>
                                  patchEditor({ parameters })
                                }
                                parameters={editor.parameters}
                              />
                            </PanelBody>
                          </Panel>
                        ) : null}

                        {isGoogleSheetsEditor ? (
                          <Panel quiet>
                            <PanelHeader
                              description="Generated from the columns you selected above — the assistant sees exactly these inputs."
                              icon={BracesIcon}
                              title="Parameters"
                            />
                            <PanelBody>
                              {editor.parameters.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Choose columns above to generate parameters.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {editor.parameters.map((parameter) => (
                                    <Pill
                                      key={parameter.name}
                                      tone={
                                        parameter.required
                                          ? "accent"
                                          : "neutral"
                                      }
                                    >
                                      <span className="font-mono">
                                        {parameter.name}
                                      </span>
                                      {parameter.required ? " · required" : ""}
                                    </Pill>
                                  ))}
                                </div>
                              )}
                            </PanelBody>
                          </Panel>
                        ) : null}

                        {selectedToolType === "api_request" ||
                        selectedToolType === "custom_webhook" ? (
                          <Panel quiet>
                            <PanelHeader
                              description="The call as it leaves Osonflow, with sample arguments in place of the model's."
                              icon={SquareTerminalIcon}
                              title="Outgoing request"
                            />
                            <PanelBody>
                              <RequestPreview
                                config={editor.config}
                                parameters={editor.parameters}
                                type={selectedToolType}
                              />
                            </PanelBody>
                          </Panel>
                        ) : null}
                      </>
                    ) : null}

                    {/* ── test ─────────────────────────────────────────── */}
                    {activeEditorTab === "test" ? (
                      <Panel quiet>
                        <PanelHeader
                          description="Call the tool with arguments you choose and read back exactly what the assistant would receive."
                          icon={FlaskConicalIcon}
                          title="Test console"
                        />
                        <PanelBody>
                          <ToolTestConsole
                            key={`test-${String(selectedToolId ?? "new")}`}
                            blockedReason={testBlockedReason}
                            onRun={async (args) => {
                              if (!selectedTool) {
                                throw new Error("Save this tool first.")
                              }

                              return await testExecute({
                                toolId: selectedTool._id,
                                args,
                              })
                            }}
                            parameters={editor.parameters}
                          />
                        </PanelBody>
                      </Panel>
                    ) : null}
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-[var(--console-hairline-soft)] bg-card px-4 py-3 sm:px-5">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex min-w-0 items-center gap-2 sm:mr-auto">
                      {isDirty ? (
                        <>
                          <span
                            aria-hidden
                            className="console-dot console-tone-warning"
                          />
                          <span className="text-xs text-muted-foreground">
                            Unsaved changes
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Changes apply to every channel this tool is on.
                        </span>
                      )}
                    </div>

                    {isDirty && selectedTool ? (
                      <Button
                        onClick={() => {
                          setEditor(toolToEditorState(selectedTool))
                          setIsDirty(false)
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Discard
                      </Button>
                    ) : null}

                    <Button
                      disabled={isSaving}
                      onClick={handleSave}
                      type="button"
                    >
                      {isSaving ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <SaveIcon />
                      )}
                      Save tool
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}

      {section === "catalog" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          <div className="mx-auto w-full max-w-[1540px]">
            <ToolCatalog
              category={catalogCategory}
              installedCounts={installedCounts}
              isGoogleConnected={isGoogleConnected}
              onCategoryChange={setCatalogCategory}
              onConfigureBuiltin={configureBuiltin}
              onConnectGoogle={() => setSection("connections")}
              onInstall={installBlueprint}
              onQueryChange={setCatalogQuery}
              query={catalogQuery}
            />
          </div>
        </div>
      ) : null}

      {section === "connections" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
            <GoogleConnectionCard
              apiKey={googleApiKey}
              isConnecting={isConnectingGoogle}
              isDisconnecting={isDisconnectingGoogle}
              isRefreshing={isLoadingSpreadsheets}
              isSavingApiKey={isSavingGoogleKey}
              loadError={spreadsheetLoadError}
              onApiKeyChange={setGoogleApiKey}
              onConnect={handleConnectGoogle}
              onDisconnect={handleDisconnectGoogle}
              onRefresh={() => void loadSpreadsheetOptions()}
              onSaveApiKey={handleSaveGoogleKey}
              onToggleApiKeyFallback={() =>
                setShowApiKeyFallback((current) => !current)
              }
              showApiKeyFallback={showApiKeyFallback}
              status={googleSheetsStatus}
            />

            <Panel>
              <PanelHeader
                actions={
                  <Pill icon={GlobeLockIcon} tone="neutral">
                    Outbound only
                  </Pill>
                }
                description="Every host your assistants can reach, the credential each one uses, and whether that credential has actually been set."
                icon={PlugZapIcon}
                title="Endpoints in use"
              />
              <PanelBody flush>
                <ConnectionsInventory tools={tools} />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                description="What happens between the model deciding to call a tool and the answer coming back."
                icon={ShieldCheckIcon}
                title="How tool calls run"
              />
              <PanelBody className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: "Scoped to this workspace",
                    body: "A tool is only ever visible to assistants in the organization that created it, and only on the channels it is switched on for.",
                  },
                  {
                    title: "Outbound requests are fenced",
                    body: "Calls must be http(s), and loopback, private, link-local and carrier-NAT addresses are refused. Every redirect hop is re-checked.",
                  },
                  {
                    title: "Responses are capped",
                    body: "At most 4,000 characters of a response reach the model, so a large payload cannot flood the conversation.",
                  },
                  {
                    title: "Voice runs a subset",
                    body: "Handoff and resolve are chat-only. Every other tool can be exposed to OpenAI Realtime and Gemini Live.",
                  },
                ].map((entry) => (
                  <div className="console-inset p-3.5" key={entry.title}>
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {entry.body}
                    </p>
                  </div>
                ))}
              </PanelBody>
            </Panel>
          </div>
        </div>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null)
        }}
        open={pendingNavigation !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This tool has edits that have not been saved. Leaving now throws
              them away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = pendingNavigation
                setPendingNavigation(null)
                setIsDirty(false)
                action?.()
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedTool?.name ?? "this tool"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The assistant stops being able to call it immediately. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDeleteDialogOpen(false)
                void handleDelete()
              }}
            >
              Delete tool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
