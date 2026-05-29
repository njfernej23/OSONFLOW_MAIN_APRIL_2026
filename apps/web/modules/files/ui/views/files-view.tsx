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

function getTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" {
  if (type === "url") return "secondary"
  if (type === "pdf") return "default"
  return "outline"
}

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
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  tone?: "default" | "green" | "amber" | "rose" | "blue"
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    blue: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  }[tone]

  return (
    <div className="surface-panel flex min-h-[5.75rem] items-start justify-between gap-3 rounded-xl px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-2 text-xl leading-tight font-semibold text-foreground">
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {sub}
          </p>
        )}
      </div>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          toneClass
        )}
      >
        <Icon className="size-4" />
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
    <section className="surface-panel rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SparklesIcon className="size-4" />
              </span>
              <span>Test knowledge accuracy</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ask a customer question and see the answer quality before your
              widget uses it.
            </p>
          </div>
          {result && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-muted-foreground uppercase">
                Confidence
              </p>
              <p className="text-2xl leading-none font-semibold text-foreground">
                {result.confidence}%
              </p>
            </div>
          )}
        </div>

        {result && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
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
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
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

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
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
    <section className="surface-panel rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <DatabaseIcon className="size-4" />
              </span>
              <span>AI answer cache</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Reused answers clear automatically when sources change.
            </p>
          </div>
          <Badge className="h-7 rounded-lg" variant="secondary">
            {stats?.entryCount ?? 0} stored
          </Badge>
        </div>
        <Button
          className="w-full"
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={SparklesIcon}
          label="Cache hits"
          tone="blue"
          value={stats?.hitCount ?? "—"}
        />
        <StatCard
          icon={SearchIcon}
          label="Semantic"
          tone="green"
          value={stats?.semanticIndexedCount ?? "—"}
        />
        <div className="col-span-2 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock3Icon className="size-3.5" />
            <span>Last cache hit</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {lastUsedLabel}
          </p>
        </div>
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
  return (
    <div className="surface-panel group relative flex min-h-[11rem] flex-col gap-3 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SourceFileIcon className="size-5" type={file.type} />
        </div>
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
      <div className="h-full overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <section className="surface-hero overflow-hidden rounded-[22px] px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
              <div className="flex min-w-0 flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpenIcon className="size-4" />
                    </span>
                    <span className="font-medium">Knowledge base</span>
                    {!isLoadingFirstPage && allFiles.length > 0 && (
                      <Badge
                        className="h-7 rounded-lg"
                        variant={
                          stats.errors
                            ? "destructive"
                            : stats.processing
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {stats.errors
                          ? `${stats.errors} needs review`
                          : stats.processing
                            ? `${stats.processing} indexing`
                            : `${stats.readiness}% ready`}
                      </Badge>
                    )}
                  </div>
                  <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Customer answers, indexed and ready
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Manage the documents and websites your AI assistant searches
                    before it responds to customers.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <PlusIcon data-icon="inline-start" />
                    Add Source
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
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Readiness
                    </p>
                    <p className="mt-2 text-3xl leading-none font-semibold text-foreground">
                      {isLoadingFirstPage ? "…" : `${stats.readiness}%`}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2Icon className="size-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: isLoadingFirstPage ? "38%" : `${stats.readiness}%`,
                    }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/45 px-2 py-2">
                    <p className="text-sm font-semibold text-foreground">
                      {isLoadingFirstPage ? "—" : stats.ready}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Indexed</p>
                  </div>
                  <div className="rounded-lg bg-muted/45 px-2 py-2">
                    <p className="text-sm font-semibold text-foreground">
                      {isLoadingFirstPage ? "—" : stats.processing}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Indexing
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/45 px-2 py-2">
                    <p className="text-sm font-semibold text-foreground">
                      {isLoadingFirstPage ? "—" : stats.errors}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Issues</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {!isLoadingFirstPage && allFiles.length > 0 && (
            <section className="grid gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={DatabaseIcon}
                label="Total sources"
                sub={`${filtered.length} visible now`}
                tone="blue"
                value={stats.total}
              />
              <StatCard
                icon={CheckCircle2Icon}
                label="Indexed"
                sub={`${stats.readiness}% ready for answers`}
                tone="green"
                value={stats.ready}
              />
              <StatCard
                icon={GlobeIcon}
                label="Web pages"
                sub="Scraped URL sources"
                tone="amber"
                value={stats.websites}
              />
              <StatCard
                icon={FileTextIcon}
                label="Documents"
                sub="Uploaded source files"
                value={stats.documents}
              />
            </section>
          )}

          <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="surface-panel min-w-0 overflow-hidden rounded-xl">
              <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Sources
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search, inspect, and remove the content used by your AI.
                  </p>
                </div>
                <Badge className="h-7 rounded-lg" variant="outline">
                  {isLoadingFirstPage
                    ? "Loading"
                    : `${filtered.length} of ${stats.total}`}
                </Badge>
              </div>

              {(isLoadingFirstPage || allFiles.length > 0) && (
                <div className="border-b border-border/70 bg-muted/15 px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pr-9 pl-9"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, type or category..."
                        value={searchQuery}
                      />
                      {searchQuery && (
                        <button
                          aria-label="Clear search"
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setSearchQuery("")}
                          type="button"
                        >
                          <XIcon className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {categories.length > 0 && (
                        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
                          <button
                            className={cn(
                              "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
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
                                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                activeCategory === cat
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                              )}
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

                      <div className="flex items-center rounded-lg border border-border/80 bg-background p-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                aria-label="List view"
                                aria-pressed={viewMode === "list"}
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
                                aria-label="Grid view"
                                aria-pressed={viewMode === "grid"}
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
                </div>
              )}

              <div className="p-3 sm:p-4">
                {isLoadingFirstPage ? (
                  viewMode === "list" ? (
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
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
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
                    <EmptyState onAdd={() => setUploadDialogOpen(true)} />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
                    <EmptySearch
                      onClear={() => {
                        setSearchQuery("")
                        setActiveCategory(null)
                      }}
                      query={searchQuery || activeCategory || ""}
                    />
                  </div>
                ) : viewMode === "list" ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
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
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <SourceFileIcon
                                      className="size-4"
                                      type={file.type}
                                    />
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
                      <div className="border-t border-border/70">
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
            </div>

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
        </div>
      </div>
    </>
  )
}
