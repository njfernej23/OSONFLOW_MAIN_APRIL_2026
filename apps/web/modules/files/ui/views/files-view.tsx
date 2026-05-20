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
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
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

function getFileIcon(type: string) {
  if (type === "url") return GlobeIcon
  if (["pdf"].includes(type)) return FileTextIcon
  return FileIcon
}

function getTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" {
  if (type === "url") return "secondary"
  if (type === "pdf") return "default"
  return "outline"
}

function getStatusIcon(status: PublicFile["status"]) {
  if (status === "ready") return CheckCircle2Icon
  if (status === "processing") return Clock3Icon
  return AlertCircleIcon
}

function getStatusClass(status: PublicFile["status"]) {
  if (status === "ready") return "text-emerald-500"
  if (status === "processing") return "text-amber-500"
  return "text-destructive"
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
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <BookOpenIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No knowledge sources yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Upload documents or add website URLs to power your AI assistant with
          accurate, up-to-date context.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <PlusIcon className="size-4" />
        Add First Source
      </Button>
    </div>
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
    <div className="surface-frosted mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-[30px] px-8 py-14 text-center">
      <SearchIcon className="size-8 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-sm text-muted-foreground">
          Try a different name or category.
        </p>
      </div>
      <Button onClick={onClear} size="sm" variant="outline">
        <XIcon className="size-4" />
        Clear search
      </Button>
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="surface-panel flex items-center gap-3 rounded-2xl border-0 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm leading-tight font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function getSupportBadgeClass(
  supportLevel: KnowledgeTestResult["supportLevel"]
) {
  if (supportLevel === "strong") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (supportLevel === "partial") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  }

  if (supportLevel === "weak") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
}

function getConfidenceBarClass(confidence: number) {
  if (confidence >= 80) return "bg-emerald-500"
  if (confidence >= 55) return "bg-sky-500"
  if (confidence >= 30) return "bg-amber-500"
  return "bg-rose-500"
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
    <section className="mt-5 rounded-[28px] border border-border/70 bg-background/82 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SparklesIcon className="size-4 text-primary" />
            <span>Test knowledge accuracy</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Ask a question your widget should answer. The result is grounded in
            indexed sources and scored by support strength.
          </p>
        </div>
        {result && (
          <div className="shrink-0 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
            <div className="flex items-center justify-between gap-5">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className="text-lg font-semibold text-foreground">
                {result.confidence}%
              </span>
            </div>
            <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  getConfidenceBarClass(result.confidence)
                )}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-20 resize-none"
          disabled={disabled || isTesting}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask something like: What is our refund policy?"
          value={question}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {disabled
              ? "Add and index a source before testing."
              : "Confidence is an evidence score, not a guaranteed truth score."}
          </p>
          <Button
            disabled={disabled || isTesting || !question.trim()}
            type="submit"
          >
            {isTesting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Test
          </Button>
        </div>
      </form>

      {result && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={getSupportBadgeClass(result.supportLevel)}
                variant="outline"
              >
                {result.supportLevel} support
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.reason}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {result.answer}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Source matches
            </p>
            <div className="mt-3 space-y-2">
              {result.sources.length ? (
                result.sources.slice(0, 5).map((source, index) => (
                  <div
                    className="rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                    key={`${source.title}-${index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {source.title}
                      </p>
                      <Badge variant="secondary">{source.score}%</Badge>
                    </div>
                    {(source.category || source.sourceUrl) && (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
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
    </section>
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
    <section className="mt-5 rounded-[28px] border border-border/70 bg-background/82 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DatabaseIcon className="size-4 text-primary" />
            <span>AI answer cache</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reused answers are cleared automatically when knowledge sources
            change.
          </p>
        </div>
        <Button
          disabled={isClearing || !stats?.entryCount}
          onClick={() => void onClear()}
          size="sm"
          variant="outline"
        >
          {isClearing ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <TrashIcon className="size-4" />
          )}
          Clear cache
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={DatabaseIcon}
          label="Cached answers"
          value={stats?.entryCount ?? "—"}
        />
        <StatCard
          icon={SparklesIcon}
          label="Cache hits"
          value={stats?.hitCount ?? "—"}
        />
        <StatCard
          icon={SearchIcon}
          label="Semantic entries"
          value={stats?.semanticIndexedCount ?? "—"}
        />
        <StatCard icon={Clock3Icon} label="Last used" value={lastUsedLabel} />
      </div>
    </section>
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
  const Icon = getFileIcon(file.type)
  const StatusIcon = getStatusIcon(file.status)

  return (
    <div className="surface-panel group relative flex flex-col gap-3 rounded-2xl border-0 p-4 transition-shadow hover:shadow-md">
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="size-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              size="sm"
              variant="ghost"
            >
              <MoreHorizontalIcon className="size-4" />
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
      <div className="flex items-center justify-between gap-2">
        <Badge className="uppercase" variant={getTypeBadgeVariant(file.type)}>
          {file.type}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getStatusClass(file.status)
                )}
              >
                <StatusIcon
                  className={cn(
                    "size-3.5",
                    file.status === "processing" && "animate-spin"
                  )}
                />
                {file.size !== "unknown" ? file.size : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent>{getStatusLabel(file.status)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
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
    const websites = allFiles.filter((f) => f.type === "url").length
    return { total, ready, websites }
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
              {viewerFile &&
                (() => {
                  const Icon = getFileIcon(viewerFile.type)
                  return (
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                  )
                })()}
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

          <div className="min-h-0 flex-1 bg-muted/30">
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
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent">
        {/* page header */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-screen-lg">
            <div className="surface-hero flex flex-col gap-4 rounded-[30px] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <p className="section-kicker">Knowledge</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Knowledge base
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manage documents and websites powering your AI assistant.
                </p>
              </div>
              <Button
                className="hidden sm:inline-flex"
                onClick={() => setUploadDialogOpen(true)}
              >
                <PlusIcon className="size-4" />
                Add Source
              </Button>
            </div>

            {/* stat cards */}
            {!isLoadingFirstPage && allFiles.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={DatabaseIcon}
                  label="Total sources"
                  value={stats.total}
                />
                <StatCard
                  icon={CheckCircle2Icon}
                  label="Indexed"
                  value={stats.ready}
                  sub={`${Math.round((stats.ready / stats.total) * 100)}% ready`}
                />
                <StatCard
                  icon={GlobeIcon}
                  label="Web pages"
                  value={stats.websites}
                  sub="scraped URLs"
                />
              </div>
            )}

            {!isLoadingFirstPage && allFiles.length > 0 && (
              <KnowledgeTestConsole
                disabled={stats.ready === 0}
                isTesting={isTestingKnowledge}
                onTest={handleKnowledgeTest}
                result={testResult}
              />
            )}

            {!isLoadingFirstPage && allFiles.length > 0 && (
              <AIReplyCachePanel
                isClearing={isClearingCache}
                onClear={handleClearCache}
                stats={cacheStats}
              />
            )}
          </div>
        </div>

        {/* toolbar */}
        {(isLoadingFirstPage || allFiles.length > 0) && (
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="surface-frosted mx-auto flex max-w-screen-lg flex-wrap items-center gap-3 rounded-[26px] px-4 py-3">
              {/* search */}
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pr-9 pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, type or category…"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>

              {/* category filter chips */}
              {categories.length > 0 && (
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      !activeCategory
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                    onClick={() => setActiveCategory(null)}
                    type="button"
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        activeCategory === cat
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                      onClick={() =>
                        setActiveCategory(activeCategory === cat ? null : cat)
                      }
                      type="button"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* view mode toggle */}
              <div className="flex items-center rounded-lg border bg-background p-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md transition-colors",
                          viewMode === "list"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
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
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md transition-colors",
                          viewMode === "grid"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
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
        )}

        {/* content */}
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-screen-lg">
            {/* ── loading skeleton ── */}
            {isLoadingFirstPage ? (
              viewMode === "list" ? (
                <div className="overflow-hidden rounded-xl border bg-background">
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <GridSkeletonCards />
                </div>
              )
            ) : allFiles.length === 0 ? (
              /* ── truly empty ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <EmptyState onAdd={() => setUploadDialogOpen(true)} />
              </div>
            ) : filtered.length === 0 ? (
              /* ── filtered empty ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <EmptySearch
                  onClear={() => {
                    setSearchQuery("")
                    setActiveCategory(null)
                  }}
                  query={searchQuery || activeCategory || ""}
                />
              </div>
            ) : viewMode === "list" ? (
              /* ── list view ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
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
                      <TableHead className="w-12 px-6 py-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((file) => {
                      const Icon = getFileIcon(file.type)
                      const StatusIcon = getStatusIcon(file.status)
                      return (
                        <TableRow
                          className="group cursor-default hover:bg-muted/40"
                          key={file.id}
                        >
                          <TableCell className="px-6 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Icon className="size-4 text-muted-foreground" />
                              </div>
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
                            <Badge
                              className="uppercase"
                              variant={getTypeBadgeVariant(file.type)}
                            >
                              {file.type}
                            </Badge>
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
                                    <StatusIcon
                                      className={cn(
                                        "size-3.5",
                                        file.status === "processing" &&
                                          "animate-spin"
                                      )}
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
                                  className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                  size="sm"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon className="size-4" />
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
                      )
                    })}
                  </TableBody>
                </Table>

                {canLoadMore && (
                  <div className="border-t">
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
              /* ── grid view ── */
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
        </div>
      </div>
    </>
  )
}
