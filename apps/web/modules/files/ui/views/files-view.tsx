"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { PublicFile } from "@workspace/backend/private/files"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DatabaseIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  GridIcon,
  LayoutListIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"
import { UploadDialog } from "../components/upload-dialog"
import { useMemo, useState, useSyncExternalStore } from "react"
import { DeleteFileDialog } from "../components/delete-file-dialog"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import {
  ConsoleHeader,
  ConsoleMeta,
  ConsolePage,
  ConsoleSearch,
  EmptyState as ConsoleEmptyState,
  Meter,
  Panel,
  PanelHeader,
  Pill,
  Stat,
  StatGrid,
  type ConsoleTone,
} from "@/modules/dashboard/ui/components/console"

type ViewerPayload =
  | { kind: "text"; filename: string; sourceUrl?: string; content: string }
  | {
      kind: "document"
      filename: string
      sourceUrl?: string
      url: string | null
    }

type ViewMode = "list" | "grid"

const DEFAULT_VIEW_MODE: ViewMode = "list"
const VIEW_MODE_CHANGE_EVENT = "osonflow-files-view-mode-change"
const VIEW_MODE_STORAGE_KEY = "osonflow.files.viewMode"

type KnowledgeTestResult = {
  answer: string
  confidence: number
  supportLevel: "strong" | "partial" | "weak" | "none"
  reason: string
  sources: {
    title: string
    filename?: string
    category?: string
    sourceUrl?: string
    score: number
  }[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function SourceFileIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  if (type === "url") {
    return <GlobeIcon className={className} />
  }

  if (type === "pdf") {
    return <FileTextIcon className={className} />
  }

  return <FileIcon className={className} />
}

function SourceStatusIcon({
  status,
  className,
}: {
  status: PublicFile["status"]
  className?: string
}) {
  if (status === "ready") {
    return <CheckCircle2Icon className={className} />
  }

  if (status === "processing") {
    return <Clock3Icon className={className} />
  }

  return <AlertCircleIcon className={className} />
}

function getStatusTone(status: PublicFile["status"]): ConsoleTone {
  if (status === "ready") return "positive"
  if (status === "processing") return "warning"
  return "critical"
}

function getStatusClass(status: PublicFile["status"]) {
  return `console-tone-${getStatusTone(status)}`
}

function getStatusLabel(status: PublicFile["status"]) {
  if (status === "ready") return "Indexed"
  if (status === "processing") return "Processing"
  return "Error"
}

function isViewMode(value: string | null): value is ViewMode {
  return value === "list" || value === "grid"
}

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_MODE
  }

  const savedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return isViewMode(savedViewMode) ? savedViewMode : DEFAULT_VIEW_MODE
}

function subscribeToViewModeChange(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(VIEW_MODE_CHANGE_EVENT, callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(VIEW_MODE_CHANGE_EVENT, callback)
  }
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <ConsoleEmptyState
      action={
        <Button onClick={onAdd} size="sm">
          <PlusIcon data-icon="inline-start" />
          Add first source
        </Button>
      }
      description="Upload documents or add website URLs so your assistant answers from your own content."
      icon={BookOpenIcon}
      title="No knowledge sources yet"
    />
  )
}

// ─── empty search state ───────────────────────────────────────────────────────

function EmptySearch({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <ConsoleEmptyState
      action={
        <Button onClick={onClear} size="sm" variant="outline">
          <XIcon data-icon="inline-start" />
          Clear search
        </Button>
      }
      description="Try a different name or category."
      icon={SearchIcon}
      title={`No results for “${query}”`}
    />
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function getSupportTone(
  supportLevel: KnowledgeTestResult["supportLevel"]
): ConsoleTone {
  if (supportLevel === "strong") return "positive"
  if (supportLevel === "partial") return "info"
  if (supportLevel === "weak") return "warning"
  return "critical"
}

function getConfidenceTone(confidence: number): ConsoleTone {
  if (confidence >= 80) return "positive"
  if (confidence >= 55) return "info"
  if (confidence >= 30) return "warning"
  return "critical"
}

function KnowledgeTestConsole({
  onTest,
  result,
  isTesting,
  disabled,
}: {
  onTest: (question: string) => Promise<void>
  result: KnowledgeTestResult | null
  isTesting: boolean
  disabled: boolean
}) {
  const [question, setQuestion] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onTest(question)
  }

  return (
    <Panel>
      <PanelHeader
        actions={
          result ? (
            <div className="text-right">
              <p className="console-label">Confidence</p>
              <p className="console-numeral mt-0.5 text-xl leading-none">
                {result.confidence}%
              </p>
            </div>
          ) : null
        }
        description="Ask a customer question and check the answer quality before the widget uses it."
        icon={SparklesIcon}
        title="Test knowledge accuracy"
      />

      <div className="px-4 py-4 sm:px-5">
      {result && (
        <Meter
          className="mb-4"
          tone={getConfidenceTone(result.confidence)}
          value={result.confidence}
        />
      )}

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-24 resize-none"
          disabled={disabled || isTesting}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask something like: What is our refund policy?"
          value={question}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {disabled
              ? "Add and index a source before testing."
              : "Confidence is an evidence score, not a guaranteed truth score."}
          </p>
          <Button
            disabled={disabled || isTesting || !question.trim()}
            size="sm"
            type="submit"
          >
            {isTesting ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            Test
          </Button>
        </div>
      </form>

      {result && (
        <div className="mt-5 grid gap-3">
          <div className="console-inset p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={getSupportTone(result.supportLevel)}>
                {result.supportLevel} support
              </Pill>
              <span className="text-xs text-muted-foreground">
                {result.reason}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {result.answer}
            </p>
          </div>

          <div className="console-inset p-3.5">
            <p className="console-label">Source matches</p>
            <div className="mt-3 space-y-2">
              {result.sources.length ? (
                result.sources.slice(0, 5).map((source, index) => (
                  <div
                    className="console-card px-3 py-2"
                    key={`${source.title}-${index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {source.title}
                      </p>
                      <span className="console-numeral shrink-0 text-xs">
                        {source.score}%
                      </span>
                    </div>
                    {(source.category || source.sourceUrl) && (
                      <p className="mt-1 truncate text-[0.68rem] text-muted-foreground">
                        {source.category || source.sourceUrl}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No matching source chunks were found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Panel>
  )
}

type AIReplyCacheStats = {
  entryCount: number
  hitCount: number
  semanticIndexedCount: number
  lastUsedAt: number | null
}

function AIReplyCachePanel({
  stats,
  onClear,
  isClearing,
}: {
  stats?: AIReplyCacheStats
  onClear: () => Promise<void>
  isClearing: boolean
}) {
  const lastUsedLabel = stats?.lastUsedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(stats.lastUsedAt))
    : "No hits yet"

  return (
    <Panel>
      <PanelHeader
        actions={<Pill>{stats?.entryCount ?? 0} stored</Pill>}
        description="Reused answers clear automatically when sources change."
        icon={DatabaseIcon}
        title="AI answer cache"
      />

      <div className="px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat
            flat
            icon={SparklesIcon}
            label="Cache hits"
            tone="info"
            value={stats?.hitCount ?? "—"}
          />
          <Stat
            flat
            icon={SearchIcon}
            label="Semantic"
            tone="positive"
            value={stats?.semanticIndexedCount ?? "—"}
          />
        </div>

        <div className="console-inset mt-3 px-3.5 py-3">
          <p className="console-label flex items-center gap-1.5">
            <Clock3Icon className="size-3" />
            Last cache hit
          </p>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {lastUsedLabel}
          </p>
        </div>

        <Button
          className="mt-3 w-full"
          disabled={isClearing || !stats?.entryCount}
          onClick={() => void onClear()}
          size="sm"
          variant="outline"
        >
          {isClearing ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <TrashIcon data-icon="inline-start" />
          )}
          Clear cache
        </Button>
      </div>
    </Panel>
  )
}

// ─── file card (grid mode) ────────────────────────────────────────────────────

function FileCard({
  file,
  onView,
  onDelete,
}: {
  file: PublicFile
  onView: (file: PublicFile) => void
  onDelete: (file: PublicFile) => void
}) {
  return (
    <div className="console-card console-interactive group relative flex min-h-[11rem] flex-col gap-3 p-4">
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="console-medallion size-10 shrink-0">
          <SourceFileIcon className="size-4" type={file.type} />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void onView(file)}>
              <EyeIcon className="size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(file)}
            >
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* name */}
      <div className="min-w-0">
        <p
          className="truncate text-sm leading-snug font-medium"
          title={file.name}
        >
          {file.name}
        </p>
        {file.category && (
          <p className="truncate text-xs text-muted-foreground">
            {file.category}
          </p>
        )}
      </div>

      {/* footer row */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <Pill className="uppercase">{file.type}</Pill>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getStatusClass(file.status)
                )}
              >
                <SourceStatusIcon
                  className={cn(
                    "size-3.5",
                    file.status === "processing" && "animate-spin"
                  )}
                  status={file.status}
                />
                {getStatusLabel(file.status)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{getStatusLabel(file.status)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-muted-foreground">
        {file.size !== "unknown" ? file.size : "Size unavailable"}
      </p>
    </div>
  )
}

// ─── skeleton loaders ─────────────────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-40" />
            </div>
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-5 w-14 rounded-full" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="size-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function GridSkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="console-card flex flex-col gap-3 p-4"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── main view ────────────────────────────────────────────────────────────────

export const FilesView = () => {
  const getViewerContent = useAction(
    (api as any).private.files.getViewerContent
  ) as (args: { entryId: string }) => Promise<ViewerPayload>
  const testKnowledgeBase = useAction(
    (api as any).private.files.testKnowledgeBase
  ) as (args: { question: string }) => Promise<KnowledgeTestResult>
  const clearAIReplyCache = useMutation(
    (api as any).private.files.clearAIReplyCache
  ) as () => Promise<number>
  const cacheStats = useQuery(
    (api as any).private.files.getAIReplyCacheStats
  ) as AIReplyCacheStats | undefined

  const files = usePaginatedQuery(
    api.private.files.list,
    {},
    { initialNumItems: 20 }
  )

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: files.status,
    loadMore: files.loadMore,
    loadSize: 20,
  })

  // ── local ui state ──────────────────────────────────────────────────────
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerFile, setViewerFile] = useState<PublicFile | null>(null)
  const [viewerPayload, setViewerPayload] = useState<ViewerPayload | null>(null)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const viewMode = useSyncExternalStore(
    subscribeToViewModeChange,
    getStoredViewMode,
    () => DEFAULT_VIEW_MODE
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<KnowledgeTestResult | null>(null)
  const [isTestingKnowledge, setIsTestingKnowledge] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

  // ── derived data ────────────────────────────────────────────────────────
  const allFiles = files.results

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const f of allFiles) {
      if (f.category) set.add(f.category)
    }
    return Array.from(set).sort()
  }, [allFiles])

  const filtered = useMemo(() => {
    let list = allFiles
    if (activeCategory) list = list.filter((f) => f.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allFiles, activeCategory, searchQuery])

  const stats = useMemo(() => {
    const total = allFiles.length
    const ready = allFiles.filter((f) => f.status === "ready").length
    const processing = allFiles.filter((f) => f.status === "processing").length
    const errors = allFiles.filter((f) => f.status === "error").length
    const websites = allFiles.filter((f) => f.type === "url").length
    const documents = Math.max(total - websites, 0)
    const readiness = total > 0 ? Math.round((ready / total) * 100) : 0

    return { total, ready, processing, errors, websites, documents, readiness }
  }, [allFiles])

  // ── handlers ────────────────────────────────────────────────────────────
  const handleDeleteClick = (file: PublicFile) => {
    setSelectedFile(file)
    setDeleteDialogOpen(true)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    window.dispatchEvent(new Event(VIEW_MODE_CHANGE_EVENT))
  }

  const handleViewClick = async (file: PublicFile) => {
    setViewerFile(file)
    setViewerOpen(true)
    setIsViewerLoading(true)
    setViewerPayload(null)
    try {
      const payload = await getViewerContent({ entryId: file.id })
      setViewerPayload(payload)
    } catch {
      toast.error("Unable to load document preview")
    } finally {
      setIsViewerLoading(false)
    }
  }

  const handleFileDeleted = () => setSelectedFile(null)

  const handleKnowledgeTest = async (question: string) => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      return
    }

    setIsTestingKnowledge(true)
    try {
      const result = await testKnowledgeBase({ question: trimmedQuestion })
      setTestResult(result)
    } catch {
      toast.error("Unable to test the knowledge base")
    } finally {
      setIsTestingKnowledge(false)
    }
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    try {
      const deletedCount = await clearAIReplyCache()
      toast.success(
        deletedCount > 0
          ? `Cleared ${deletedCount} cached AI answers.`
          : "AI answer cache is already empty."
      )
    } catch {
      toast.error("Unable to clear AI answer cache")
    } finally {
      setIsClearingCache(false)
    }
  }

  const closeViewer = (open: boolean) => {
    setViewerOpen(open)
    if (!open) {
      setViewerFile(null)
      setViewerPayload(null)
      setIsViewerLoading(false)
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── dialogs ── */}
      <DeleteFileDialog
        file={selectedFile}
        onDeleted={handleFileDeleted}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
      <UploadDialog
        onOpenChange={setUploadDialogOpen}
        open={uploadDialogOpen}
      />

      {/* ── document viewer ── */}
      <Dialog onOpenChange={closeViewer} open={viewerOpen}>
        <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewerFile && (
                <SourceFileIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  type={viewerFile.type}
                />
              )}
              <span className="truncate">
                {viewerFile?.name ?? "Document Viewer"}
              </span>
            </DialogTitle>
            {viewerPayload?.sourceUrl && (
              <DialogDescription className="flex items-center gap-1 truncate text-xs">
                <GlobeIcon className="size-3 shrink-0" />
                <a
                  className="truncate hover:underline"
                  href={viewerPayload.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {viewerPayload.sourceUrl}
                </a>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 bg-muted/35">
            {isViewerLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                <span className="text-sm">Loading preview…</span>
              </div>
            ) : viewerPayload?.kind === "text" ? (
              <div className="h-full overflow-auto p-6">
                <pre className="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                  {viewerPayload.content}
                </pre>
              </div>
            ) : viewerPayload?.kind === "document" && viewerPayload.url ? (
              <iframe
                className="h-full min-h-0 w-full border-0"
                src={viewerPayload.url}
                title={viewerPayload.filename}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileTextIcon className="size-8 opacity-40" />
                <span className="text-sm">
                  No preview available for this document.
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── page ── */}
      <ConsolePage>
        <ConsoleHeader
          actions={
            <>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add source
              </Button>
              {allFiles.length > 0 && (
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setActiveCategory(null)
                  }}
                  variant="outline"
                >
                  <SearchIcon data-icon="inline-start" />
                  Reset view
                </Button>
              )}
            </>
          }
          description="The documents and websites your assistant searches before it answers a customer."
          eyebrow="Knowledge base"
          icon={BookOpenIcon}
          meta={
            isLoadingFirstPage ? null : (
              <>
                <ConsoleMeta label="Sources" value={stats.total} />
                <ConsoleMeta
                  dot
                  label={
                    stats.errors
                      ? "Need review"
                      : stats.processing
                        ? "Indexing"
                        : "Ready"
                  }
                  tone={
                    stats.errors
                      ? "critical"
                      : stats.processing
                        ? "warning"
                        : "positive"
                  }
                  value={
                    stats.errors
                      ? stats.errors
                      : stats.processing
                        ? stats.processing
                        : `${stats.readiness}%`
                  }
                />
              </>
            )
          }
          title="Customer answers, indexed and ready"
        />

          {!isLoadingFirstPage && allFiles.length > 0 && (
            <StatGrid>
              <Stat
                hint={`${filtered.length} visible now`}
                icon={DatabaseIcon}
                label="Total sources"
                tone="info"
                value={stats.total}
              />
              <Stat
                hint={`${stats.readiness}% ready for answers`}
                icon={CheckCircle2Icon}
                label="Indexed"
                progress={stats.readiness}
                tone="positive"
                value={stats.ready}
              />
              <Stat
                hint="Scraped URL sources"
                icon={GlobeIcon}
                label="Web pages"
                tone="warning"
                value={stats.websites}
              />
              <Stat
                hint="Uploaded source files"
                icon={FileTextIcon}
                label="Documents"
                value={stats.documents}
              />
            </StatGrid>
          )}

          <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <Panel className="min-w-0">
              <PanelHeader
                actions={
                  <Pill>
                    {isLoadingFirstPage
                      ? "Loading"
                      : `${filtered.length} of ${stats.total}`}
                  </Pill>
                }
                description="Search, inspect, and remove the content used by your AI."
                title="Sources"
              />

              {(isLoadingFirstPage || allFiles.length > 0) && (
                <div className="border-b border-[var(--console-hairline-soft)] px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <ConsoleSearch
                      className="flex-1"
                      onChange={setSearchQuery}
                      placeholder="Search by name, type or category…"
                      value={searchQuery}
                    />

                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {categories.length > 0 && (
                        <div className="console-segment flex max-w-full items-center gap-1 overflow-x-auto">
                          <button
                            className={cn(
                              "console-segment-item shrink-0 border border-transparent px-2.5 py-1 text-xs font-medium",
                              activeCategory
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}
                            data-active={!activeCategory || undefined}
                            onClick={() => setActiveCategory(null)}
                            type="button"
                          >
                            All
                          </button>
                          {categories.map((cat) => (
                            <button
                              className={cn(
                                "console-segment-item shrink-0 border border-transparent px-2.5 py-1 text-xs font-medium",
                                activeCategory === cat
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                              data-active={activeCategory === cat || undefined}
                              key={cat}
                              onClick={() =>
                                setActiveCategory(
                                  activeCategory === cat ? null : cat
                                )
                              }
                              type="button"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="console-segment flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                aria-label="List view"
                                aria-pressed={viewMode === "list"}
                                className={cn(
                                  "console-segment-item flex size-7 items-center justify-center border border-transparent",
                                  viewMode === "list"
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                                data-active={viewMode === "list" || undefined}
                                onClick={() => handleViewModeChange("list")}
                                type="button"
                              >
                                <LayoutListIcon className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>List view</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                aria-label="Grid view"
                                aria-pressed={viewMode === "grid"}
                                className={cn(
                                  "console-segment-item flex size-7 items-center justify-center border border-transparent",
                                  viewMode === "grid"
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                                data-active={viewMode === "grid" || undefined}
                                onClick={() => handleViewModeChange("grid")}
                                type="button"
                              >
                                <GridIcon className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Grid view</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 sm:p-4">
                {isLoadingFirstPage ? (
                  viewMode === "list" ? (
                    <div className="overflow-hidden rounded-[10px] border border-[var(--console-hairline-soft)]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-6 py-3 font-medium">
                              Name
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Type
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Size
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Status
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableSkeletonRows />
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <GridSkeletonCards />
                    </div>
                  )
                ) : allFiles.length === 0 ? (
                  <div className="overflow-hidden rounded-[10px] border border-[var(--console-hairline-soft)]">
                    <EmptyState onAdd={() => setUploadDialogOpen(true)} />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="overflow-hidden rounded-[10px] border border-[var(--console-hairline-soft)]">
                    <EmptySearch
                      onClear={() => {
                        setSearchQuery("")
                        setActiveCategory(null)
                      }}
                      query={searchQuery || activeCategory || ""}
                    />
                  </div>
                ) : viewMode === "list" ? (
                  <div className="overflow-hidden rounded-[10px] border border-[var(--console-hairline-soft)]">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-[18rem] px-6 py-3 font-medium">
                              Name
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Type
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Size
                            </TableHead>
                            <TableHead className="px-6 py-3 font-medium">
                              Status
                            </TableHead>
                            <TableHead className="w-12 px-6 py-3" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((file) => (
                            <TableRow
                              className="group cursor-default hover:bg-muted/40"
                              key={file.id}
                            >
                              <TableCell className="px-6 py-3.5">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="console-medallion size-8 shrink-0">
                                    <SourceFileIcon
                                      className="size-3.5"
                                      type={file.type}
                                    />
                                  </span>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate text-sm font-medium"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </p>
                                    {file.category && (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {file.category}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-3.5">
                                <Pill className="uppercase">{file.type}</Pill>
                              </TableCell>
                              <TableCell className="px-6 py-3.5 text-sm text-muted-foreground">
                                {file.size !== "unknown" ? file.size : "—"}
                              </TableCell>
                              <TableCell className="px-6 py-3.5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={cn(
                                          "flex w-fit items-center gap-1.5 text-xs font-medium",
                                          getStatusClass(file.status)
                                        )}
                                      >
                                        <SourceStatusIcon
                                          className={cn(
                                            "size-3.5",
                                            file.status === "processing" &&
                                              "animate-spin"
                                          )}
                                          status={file.status}
                                        />
                                        {getStatusLabel(file.status)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {file.status === "ready"
                                        ? "This source is indexed and available for AI search."
                                        : file.status === "processing"
                                          ? "Currently being processed and indexed."
                                          : "Indexing failed. Try re-uploading."}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="px-6 py-3.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      className="opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                                      size="icon-sm"
                                      variant="ghost"
                                    >
                                      <MoreHorizontalIcon />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => void handleViewClick(file)}
                                    >
                                      <EyeIcon className="size-4" />
                                      View content
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteClick(file)}
                                    >
                                      <TrashIcon className="size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {canLoadMore && (
                      <div className="border-t border-[var(--console-hairline-soft)]">
                        <InfiniteScrollTrigger
                          canLoadMore={canLoadMore}
                          isLoadingMore={isLoadingMore}
                          onLoadMore={handleLoadMore}
                          ref={topElementRef}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered.map((file) => (
                        <FileCard
                          file={file}
                          key={file.id}
                          onDelete={handleDeleteClick}
                          onView={(f) => void handleViewClick(f)}
                        />
                      ))}
                    </div>
                    {canLoadMore && (
                      <div className="mt-4">
                        <InfiniteScrollTrigger
                          canLoadMore={canLoadMore}
                          isLoadingMore={isLoadingMore}
                          onLoadMore={handleLoadMore}
                          ref={topElementRef}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </Panel>

            {!isLoadingFirstPage && allFiles.length > 0 && (
              <aside className="flex min-w-0 flex-col gap-4">
                <KnowledgeTestConsole
                  disabled={stats.ready === 0}
                  isTesting={isTestingKnowledge}
                  onTest={handleKnowledgeTest}
                  result={testResult}
                />
                <AIReplyCachePanel
                  isClearing={isClearingCache}
                  onClear={handleClearCache}
                  stats={cacheStats}
                />
              </aside>
            )}
          </section>
      </ConsolePage>
    </>
  )
}
